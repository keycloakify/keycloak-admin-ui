import { downloadAndExtractArchive } from "./tools/downloadAndExtractArchive";
import {
    join as pathJoin,
    relative as pathRelative,
    sep as pathSep,
    basename as pathBasename,
    dirname as pathDirname
} from "path";
import { getThisCodebaseRootDirPath } from "./tools/getThisCodebaseRootDirPath";
import { getProxyFetchOptions } from "./tools/fetchProxyOptions";
import { transformCodebase } from "./tools/transformCodebase";
import { isInside } from "./tools/isInside";
import { assert, is, type Equals } from "tsafe/assert";
import fetch from "make-fetch-happen";
import * as fs from "fs";
import chalk from "chalk";
import { id } from "tsafe/id";
import { z } from "zod";

(async () => {
    const { parsedPackageJson } = (() => {
        type ParsedPackageJson = {
            name: string;
            version: string;
            repository: {
                type: string;
                url: string;
            };
            license: string;
            author: string;
            homepage: string;
            dependencies?: Record<string, string>;
        };

        const zParsedPackageJson = (() => {
            type TargetType = ParsedPackageJson;

            const zTargetType = z.object({
                name: z.string(),
                version: z.string(),
                repository: z.object({
                    type: z.string(),
                    url: z.string()
                }),
                license: z.string(),
                author: z.string(),
                homepage: z.string(),
                dependencies: z.record(z.string()).optional()
            });

            type InferredType = z.infer<typeof zTargetType>;

            assert<Equals<ParsedPackageJson, InferredType>>;

            return id<z.ZodType<TargetType>>(zTargetType);
        })();

        assert<Equals<z.TypeOf<typeof zParsedPackageJson>, ParsedPackageJson>>;

        const parsedPackageJson = JSON.parse(
            fs.readFileSync(pathJoin(getThisCodebaseRootDirPath(), "package.json")).toString("utf8")
        );

        zParsedPackageJson.parse(parsedPackageJson);

        assert(is<ParsedPackageJson>(parsedPackageJson));

        return { parsedPackageJson };
    })();

    const keycloakVersion = parsedPackageJson.version.slice(0, -3);

    const fetchOptions = getProxyFetchOptions({
        npmConfigGetCwd: getThisCodebaseRootDirPath()
    });

    const cacheDirPath = pathJoin(getThisCodebaseRootDirPath(), "node_modules", ".cache", "scripts");

    const { extractedDirPath } = await downloadAndExtractArchive({
        url: `https://github.com/keycloak/keycloak/archive/refs/tags/${keycloakVersion}.zip`,
        cacheDirPath,
        fetchOptions,
        uniqueIdOfOnArchiveFile: "download_keycloak-admin-ui-sources",
        onArchiveFile: async ({ fileRelativePath, readFile, writeFile }) => {
            fileRelativePath = fileRelativePath.split(pathSep).slice(1).join(pathSep);

            if (/\.test\.[a-z0-9]{2,3}/.test(fileRelativePath)) {
                return;
            }

            {
                const dirPath = pathJoin("js", "apps", "admin-ui");

                if (
                    !isInside({
                        filePath: fileRelativePath,
                        dirPath
                    })
                ) {
                    return;
                }

                fileRelativePath = pathRelative(dirPath, fileRelativePath);
            }

            if (fileRelativePath === "package.json") {
                const version = JSON.parse((await readFile()).toString("utf8")).version as unknown;

                assert(typeof version === "string");

                await writeFile({
                    fileRelativePath: "package.json",
                    modifiedData: Buffer.from(JSON.stringify({ version }), "utf8")
                });

                return;
            }

            {
                const dirPath = "src";

                if (
                    !isInside({
                        filePath: fileRelativePath,
                        dirPath
                    })
                ) {
                    return;
                }

                fileRelativePath = pathRelative(dirPath, fileRelativePath);
            }

            if (fileRelativePath === "index.ts") {
                return;
            }

            if (fileRelativePath === "vite-env.d.ts") {
                return;
            }

            if (!fileRelativePath.endsWith(".ts") && !fileRelativePath.endsWith(".tsx")) {
                await writeFile({ fileRelativePath });
                return;
            }

            if (fileRelativePath === "main.tsx") {
                await writeFile({
                    fileRelativePath: pathJoin(pathDirname(fileRelativePath), "KcAdminUi.tsx"),
                    modifiedData: Buffer.from(
                        [
                            `import "@patternfly/patternfly/patternfly-addons.css";`,
                            `import "@patternfly/react-core/dist/styles/base.css";`,
                            `import "./index.css";`,
                            `import { useEffect, useReducer } from "react";`,
                            `import { initializeDarkMode } from "@keycloakify/keycloak-admin-ui/ui-shared";`,
                            `import { createBrowserRouter, RouterProvider } from "react-router-dom";`,
                            `import { initI18n } from "@keycloakify/keycloak-admin-ui/i18n/i18n";`,
                            `import { routes } from "@keycloakify/keycloak-admin-ui/routes";`,
                            ``,
                            `const router = createBrowserRouter(routes);`,
                            `const prI18nInitialized = initI18n();`,
                            ``,
                            `initializeDarkMode();`,
                            ``,
                            `export default function KcAdminUi() {`,
                            `  const [isI18nInitialized, setI18nInitialized] = useReducer(() => true, false);`,
                            ``,
                            `  useEffect(() => {`,
                            `    prI18nInitialized.then(() => setI18nInitialized());`,
                            `  }, []);`,
                            ``,
                            `  if (!isI18nInitialized) {`,
                            `    return null;`,
                            `  }`,
                            ``,
                            `  return <RouterProvider router={router} />;`,
                            `}`
                        ].join("\n"),
                        "utf8"
                    )
                });

                return;
            }

            let modifiedSourceCode = (await readFile()).toString("utf8");

            modifiedSourceCode = modifiedSourceCode.replaceAll(
                `"@keycloak/keycloak-ui-shared"`,
                `"${new Array(fileRelativePath.split(pathSep).length + 1).fill("..").join("/")}/shared/keycloak-ui-shared"`
            );

            if (fileRelativePath === `i18n${pathSep}i18n.ts`) {
                const modifiedSourceCode_before = modifiedSourceCode;
                modifiedSourceCode = modifiedSourceCode.replaceAll(
                    "export const i18n",
                    [`export function initI18n() { return i18n.init(); }`, "", "const i18n"].join("\n")
                );
                assert(modifiedSourceCode !== modifiedSourceCode_before);
            } else {
                const search = `from "@keycloakify/keycloak-admin-ui/i18n/i18n";`;

                if (modifiedSourceCode.includes(search)) {
                    modifiedSourceCode = modifiedSourceCode
                        .split("\n")
                        .map(line => {
                            if (!line.includes(search)) {
                                return line;
                            }

                            const tokens = line
                                .split("{")[1]
                                .split("}")[0]
                                .split(",")
                                .map(token => token.trim())
                                .filter(t => t !== "i18n");

                            if (tokens.length === 0) {
                                return undefined;
                            }

                            return `import { ${tokens.join(", ")} } from "@keycloakify/keycloak-admin-ui/i18n/i18n";`;
                        })
                        .filter(line => line !== undefined)
                        .join("\n");

                    modifiedSourceCode = modifiedSourceCode.replaceAll("i18n.", "getI18n().");

                    modifiedSourceCode = [
                        `import { getI18n } from "react-i18next";`,
                        modifiedSourceCode
                    ].join("\n");
                }
            }

            if (fileRelativePath === "PageHeader.tsx") {
                for (const [search, replace] of [
                    [undefined, `import logoSvgUrl from "./assets/logo.svg";`],
                    [`const logo = environment.logo ? environment.logo : "/logo.svg";`, ""],
                    [`src={environment.resourceUrl + logo}`, `src={logoSvgUrl}`]
                ] as const) {
                    const sourceCode_before = modifiedSourceCode;

                    const sourceCode_after: string =
                        search === undefined
                            ? [replace, modifiedSourceCode].join("\n")
                            : modifiedSourceCode.replace(search, replace);

                    assert(sourceCode_before !== sourceCode_after);

                    modifiedSourceCode = sourceCode_after;
                }
            }

            await writeFile({
                fileRelativePath,
                modifiedData: Buffer.from(modifiedSourceCode, "utf8")
            });
        }
    });

    const distDirPath = pathJoin(getThisCodebaseRootDirPath(), "dist");

    if (fs.existsSync(distDirPath)) {
        fs.rmSync(distDirPath, { recursive: true });
    }

    const keycloakThemeDirPath = pathJoin(distDirPath, "keycloak-theme");
    const adminDirPath = pathJoin(keycloakThemeDirPath, "admin");

    let keycloakAdminUiVersion: string | undefined = undefined;

    transformCodebase({
        srcDirPath: extractedDirPath,
        destDirPath: adminDirPath,
        transformSourceCode: ({ fileRelativePath, sourceCode }) => {
            if (fileRelativePath === "package.json") {
                const version = JSON.parse(sourceCode.toString("utf8")).version as unknown;

                assert(typeof version === "string");

                keycloakAdminUiVersion = version;

                return;
            }

            return { modifiedSourceCode: sourceCode };
        }
    });

    assert(keycloakAdminUiVersion !== undefined);

    {
        const assetsDirPath = pathJoin(adminDirPath, "assets");

        fs.mkdirSync(assetsDirPath, { recursive: true });

        (["logo.svg"] as const).map(async fileBasename => {
            const response = await fetch(
                `https://raw.githubusercontent.com/keycloak/keycloak/${keycloakVersion}/js/apps/admin-ui/public/${fileBasename}`,
                fetchOptions
            );

            const content = await response.text();

            const { targetFileBasename, targetContent } = await (async () => {
                switch (fileBasename) {
                    case "logo.svg":
                        return {
                            targetFileBasename: "logo.svg",
                            targetContent: content
                        };
                }
                assert<Equals<typeof fileBasename, never>>;
            })();

            fs.writeFileSync(
                pathJoin(assetsDirPath, targetFileBasename),
                Buffer.from(targetContent, "utf8")
            );
        });
    }

    {
        const { extractedDirPath } = await downloadAndExtractArchive({
            url: `https://repo1.maven.org/maven2/org/keycloak/keycloak-admin-ui/${keycloakVersion}/keycloak-admin-ui-${keycloakAdminUiVersion}.jar`,
            cacheDirPath,
            fetchOptions,
            uniqueIdOfOnArchiveFile: "bring_in_admin_i18n_messages",
            onArchiveFile: async ({ fileRelativePath, writeFile }) => {
                if (
                    !fileRelativePath.startsWith(pathJoin("theme", "keycloak.v2", "admin", "messages"))
                ) {
                    return;
                }
                await writeFile({
                    fileRelativePath: pathBasename(fileRelativePath)
                });
            }
        });

        transformCodebase({
            srcDirPath: extractedDirPath,
            destDirPath: pathJoin(distDirPath, "messages")
        });
    }

    const parsedPackageJson_keycloakAdminUi = await (async () => {
        type ParsedPackageJson = {
            dependencies?: Record<string, string>;
            peerDependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
        };

        const zParsedPackageJson = (() => {
            type TargetType = ParsedPackageJson;

            const zTargetType = z.object({
                dependencies: z.record(z.string()).optional(),
                peerDependencies: z.record(z.string()).optional(),
                devDependencies: z.record(z.string()).optional()
            });

            type InferredType = z.infer<typeof zTargetType>;

            assert<Equals<ParsedPackageJson, InferredType>>;

            return id<z.ZodType<TargetType>>(zTargetType);
        })();

        assert<Equals<z.TypeOf<typeof zParsedPackageJson>, ParsedPackageJson>>;

        const parsedPackageJson = await fetch(
            `https://unpkg.com/@keycloak/keycloak-admin-ui@${keycloakAdminUiVersion}/package.json`,
            fetchOptions
        ).then(response => response.json());

        zParsedPackageJson.parse(parsedPackageJson);

        assert(is<ParsedPackageJson>(parsedPackageJson));

        return parsedPackageJson;
    })();

    fs.writeFileSync(
        pathJoin(distDirPath, "package.json"),
        Buffer.from(
            JSON.stringify(
                {
                    name: parsedPackageJson.name,
                    version: parsedPackageJson.version,
                    repository: parsedPackageJson.repository,
                    license: parsedPackageJson.license,
                    author: parsedPackageJson.author,
                    homepage: parsedPackageJson.homepage,
                    dependencies: parsedPackageJson.dependencies,
                    peerDependencies: await (async () => {
                        const peerDependencies = Object.fromEntries(
                            Object.entries({
                                ...parsedPackageJson_keycloakAdminUi.dependencies,
                                ...parsedPackageJson_keycloakAdminUi.peerDependencies
                            }).filter(([name]) => {
                                if (name === "admin-ui") {
                                    return false;
                                }
                                if (name === "react") {
                                    return false;
                                }
                                if (name === "react-dom") {
                                    return false;
                                }

                                return true;
                            })
                        );

                        {
                            const name = "@keycloak/keycloak-ui-shared";

                            const version = peerDependencies[name];

                            assert(typeof version === "string");
                            assert(/^[1-9]/.test(version));

                            peerDependencies[name] = `${version}001`;
                        }

                        for (const name of Object.keys(peerDependencies)) {
                            const typeName = name.startsWith("@")
                                ? `@types/${name.substring(1).replace("/", "__")}`
                                : `@types/${name}`;

                            const versionRange =
                                parsedPackageJson_keycloakAdminUi.devDependencies?.[typeName];

                            if (versionRange === undefined) {
                                continue;
                            }

                            peerDependencies[typeName] = versionRange;
                        }

                        return peerDependencies;
                    })()
                },
                null,
                2
            ),
            "utf8"
        )
    );

    for (const fileBasename of ["README.md", "LICENSE"] as const) {
        fs.cpSync(
            pathJoin(getThisCodebaseRootDirPath(), fileBasename),
            pathJoin(distDirPath, fileBasename)
        );
    }

    console.log(
        chalk.green(
            `\n\nPulled @keycloak/keycloak-admin-ui@${keycloakAdminUiVersion} from keycloak version ${keycloakVersion}`
        )
    );
})();
