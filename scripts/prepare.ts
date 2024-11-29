import { downloadAndExtractArchive } from "./tools/downloadAndExtractArchive";
import {
    join as pathJoin,
    relative as pathRelative,
    sep as pathSep,
    dirname as pathDirname,
    basename as pathBasename
} from "path";
import { getThisCodebaseRootDirPath } from "./tools/getThisCodebaseRootDirPath";
import { getProxyFetchOptions } from "./tools/fetchProxyOptions";
import { transformCodebase } from "./tools/transformCodebase";
import { isInside } from "./tools/isInside";
import { assert, type Equals } from "tsafe/assert";
import fetch from "make-fetch-happen";
import * as fs from "fs";
import chalk from "chalk";
import * as child_process from "child_process";
import { id } from "tsafe/id";

(async () => {
    child_process.execSync("git clean -Xfd .", {
        cwd: pathJoin(getThisCodebaseRootDirPath(), "src")
    });

    const { keycloakVersion, distPackageJson } = (() => {
        const parsedPackageJson = JSON.parse(
            fs.readFileSync(pathJoin(getThisCodebaseRootDirPath(), "package.json")).toString("utf8")
        );

        const { name, repository, author, license, homepage, version } = parsedPackageJson;
        const keycloakVersion: string = version.slice(0, -3);

        return {
            keycloakVersion,
            distPackageJson: {
                name,
                version,
                repository,
                license,
                author,
                homepage,
                peerDependencies: id<Record<string, string>>({}),
                publishConfig: {
                    access: "public"
                }
            }
        };
    })();

    const fetchOptions = getProxyFetchOptions({
        npmConfigGetCwd: getThisCodebaseRootDirPath()
    });

    const cacheDirPath = pathJoin(getThisCodebaseRootDirPath(), "node_modules", ".cache", "scripts");

    let keycloakUiSharedVersion: string | undefined;

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
                keycloakAdminUiVersion = JSON.parse((await readFile()).toString("utf8"))["version"];

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

            if (fileRelativePath === "main.tsx") {
                return;
            }

            if (fileRelativePath === "index.ts") {
                return;
            }

            if (fileRelativePath === "vite-env.d.ts") {
                return;
            }

            const sourceCode = (await readFile()).toString("utf8");

            let modifiedSourceCode: string | undefined = undefined;

            if (fileRelativePath.endsWith(".ts") || fileRelativePath.endsWith(".tsx")) {
                modifiedSourceCode = sourceCode.replaceAll(
                    `"@keycloak/keycloak-ui-shared"`,
                    //`"@keycloakify/keycloak-admin-ui/ui-shared"`
                    `${new Array(fileRelativePath.split(pathSep).length).fill("..").join("/")}/shared/keycloak-ui-shared`
                );

                if (fileRelativePath === `i18n${pathSep}i18n.ts`) {
                    const modifiedSourceCode_before = modifiedSourceCode;
                    modifiedSourceCode = modifiedSourceCode.replaceAll(
                        "export const i18n",
                        [`export function initI18n() { return i18n.init(); }`, "", "const i18n"].join(
                            "\n"
                        )
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
            }

            await writeFile({
                fileRelativePath,
                modifiedData:
                    modifiedSourceCode === undefined
                        ? undefined
                        : Buffer.from(modifiedSourceCode, "utf8")
            });
        }
    });

    {
        const publicDirPath = pathJoin(
            getThisCodebaseRootDirPath(),
            "keycloak-theme",
            "admin",
            "public"
        );

        if (!fs.existsSync(publicDirPath)) {
            fs.mkdirSync(publicDirPath);
        }

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
                assert<Equals<typeof fileBasename, never>>(false);
            })();

            fs.writeFileSync(
                pathJoin(publicDirPath, targetFileBasename),
                Buffer.from(targetContent, "utf8")
            );
        });
    }

    let keycloakAdminUiVersion: string | undefined;

    transformCodebase({
        srcDirPath: extractedDirPath,
        destDirPath: pathJoin(getThisCodebaseRootDirPath(), "keycloak-theme", "admin")
    });

    assert(typeof keycloakAdminUiVersion === "string");

    const parsedAdminUiPackageJson = await fetch(
        `https://unpkg.com/@keycloak/keycloak-admin-ui@${keycloakAdminUiVersion}/package.json`,
        fetchOptions
    ).then(response => response.json());

    {
        const { extractedDirPath } = await downloadAndExtractArchive({
            url: `https://repo1.maven.org/maven2/org/keycloak/keycloak-admin-ui/${keycloakVersion}/keycloak-admin-ui-${keycloakUiSharedVersion}.jar`,
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
            destDirPath: pathJoin(getThisCodebaseRootDirPath(), "keycloak-theme", "admin", "messages")
        });
    }

    let devDependenciesToInstall: Record<string, string> | undefined = undefined;

    {
        for (const name of Object.keys(thisParsedPackageJson["peerDependencies"])) {
            delete thisParsedPackageJson["devDependencies"][name];
        }

        const parsedSharedUiPackageJson = await fetch(
            `https://unpkg.com/@keycloak/keycloak-ui-shared@${keycloakUiSharedVersion}/package.json`,
            fetchOptions
        ).then(response => response.json());

        thisParsedPackageJson["peerDependencies"] = Object.fromEntries(
            Object.entries({
                ...parsedAdminUiPackageJson["dependencies"],
                ...parsedSharedUiPackageJson["dependencies"]
            }).filter(
                ([name]) =>
                    name !== "react" &&
                    name !== "react-dom" &&
                    name !== parsedSharedUiPackageJson["name"]
            )
        );

        devDependenciesToInstall = {};

        for (const name of Object.keys(thisParsedPackageJson["peerDependencies"])) {
            const typeName = name.startsWith("@")
                ? `@types/${name.substring(1).replace("/", "__")}`
                : `@types/${name}`;

            const versionRange = {
                ...parsedAdminUiPackageJson["devDependencies"],
                ...parsedSharedUiPackageJson["devDependencies"]
            }[typeName];

            if (versionRange === undefined) {
                continue;
            }

            devDependenciesToInstall[typeName] = versionRange;
        }

        Object.assign(thisParsedPackageJson["devDependencies"], {
            ...thisParsedPackageJson["peerDependencies"],
            ...devDependenciesToInstall
        });
    }

    fs.writeFileSync(
        pathJoin(getThisCodebaseRootDirPath(), "package.json"),
        JSON.stringify(thisParsedPackageJson, undefined, 2)
    );

    child_process.execSync("yarn install --ignore-scripts", {
        cwd: getThisCodebaseRootDirPath(),
        stdio: "ignore"
    });

    child_process.execSync("yarn format", {
        cwd: getThisCodebaseRootDirPath(),
        stdio: "ignore"
    });

    fs.writeFileSync(
        pathJoin(getThisCodebaseRootDirPath(), "dependencies.gen.json"),
        Buffer.from(
            JSON.stringify(
                {
                    dependencies: thisParsedPackageJson["peerDependencies"],
                    devDependencies: devDependenciesToInstall
                },
                null,
                2
            ),
            "utf8"
        )
    );

    const readme = fs
        .readFileSync(pathJoin(__dirname, "README-template.md"))
        .toString("utf8")
        .replaceAll("{{ACCOUNT_UI_VERSION}}", keycloakAdminUiVersion)
        .replaceAll("{{KEYCLOAK_VERSION}}", keycloakVersion)
        .replaceAll("{{THIS_VERSION}}", thisVersion)
        .replaceAll(
            "{{DEPENDENCIES}}",
            JSON.stringify(
                {
                    dependencies: {
                        [thisParsedPackageJson["name"]]: thisVersion,
                        ...thisParsedPackageJson["peerDependencies"]
                    },
                    devDependencies: devDependenciesToInstall
                },
                null,
                2
            )
        );

    fs.writeFileSync(pathJoin(getThisCodebaseRootDirPath(), "README.md"), Buffer.from(readme, "utf8"));

    child_process.execSync("yarn format");

    console.log(
        chalk.green(
            `\n\nPulled @keycloak/keycloak-admin-ui@${keycloakAdminUiVersion} from keycloak version ${keycloakVersion}`
        )
    );
})();
