import { downloadAndExtractArchive } from "./tools/downloadAndExtractArchive";
import {
    join as pathJoin,
    relative as pathRelative,
    sep as pathSep,
    basename as pathBasename
} from "path";
import { getThisCodebaseRootDirPath } from "./tools/getThisCodebaseRootDirPath";
import { getProxyFetchOptions } from "./tools/fetchProxyOptions";
import { transformCodebase } from "./tools/transformCodebase";
import { isInside } from "./tools/isInside";
import { assert, is, type Equals } from "tsafe/assert";
import fetch from "make-fetch-happen";
import * as fs from "fs";
import chalk from "chalk";
import child_process from "child_process";
import { id } from "tsafe/id";
import { z } from "zod";

(async () => {
    const { parsedPackageJson } = (() => {
        type ParsedPackageJson = {
            name: string;
            version: string;
            repository: Record<string, unknown>;
            license: string;
            author: string;
            homepage: string;
            keywords: string[];
            dependencies?: Record<string, string>;
        };

        const zParsedPackageJson = (() => {
            type TargetType = ParsedPackageJson;

            const zTargetType = z.object({
                name: z.string(),
                version: z.string(),
                repository: z.record(z.unknown()),
                license: z.string(),
                author: z.string(),
                homepage: z.string(),
                keywords: z.array(z.string()),
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
                return;
            }

            let modifiedSourceCode = (await readFile()).toString("utf8");

            modifiedSourceCode = modifiedSourceCode.replaceAll(
                `"@keycloak/keycloak-ui-shared"`,
                `"${new Array(fileRelativePath.split(pathSep).length).fill("..").join("/") || ".."}/shared/keycloak-ui-shared"`
            );

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
                modifiedData: Buffer.from(["// @ts-nocheck", "", modifiedSourceCode].join("\n"), "utf8")
            });
        }
    });

    const distDirPath = pathJoin(getThisCodebaseRootDirPath(), "dist");

    if (fs.existsSync(distDirPath)) {
        fs.rmSync(distDirPath, { recursive: true });
    }

    child_process.execSync(`npx tsc`, { cwd: getThisCodebaseRootDirPath() });

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

    transformCodebase({
        srcDirPath: pathJoin(getThisCodebaseRootDirPath(), "keycloak-theme"),
        destDirPath: keycloakThemeDirPath
    });

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
                    main: "index.js",
                    types: "index.d.ts",
                    version: parsedPackageJson.version,
                    repository: parsedPackageJson.repository,
                    license: parsedPackageJson.license,
                    author: parsedPackageJson.author,
                    homepage: parsedPackageJson.homepage,
                    keywords: parsedPackageJson.keywords,
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

                            const name_keycloakify = name.replace("@keycloak", "@keycloakify");

                            const versions_keycloakify: string[] = JSON.parse(
                                child_process
                                    .execSync(`npm show ${name_keycloakify} versions --json`)
                                    .toString("utf8")
                                    .trim()
                            );

                            const version_keycloakify = [...versions_keycloakify]
                                .reverse()
                                .find(version_keycloakify => version_keycloakify.startsWith(version));

                            assert(version_keycloakify !== undefined);

                            console.log({ name_keycloakify, version_keycloakify });

                            peerDependencies[name_keycloakify] = version_keycloakify;
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
