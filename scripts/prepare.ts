import { downloadAndExtractArchive } from "./tools/downloadAndExtractArchive";
import {
  join as pathJoin,
  relative as pathRelative,
  sep as pathSep,
  dirname as pathDirname,
  basename as pathBasename,
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

(async () => {
  child_process.execSync("git clean -Xfd .", {
    cwd: pathJoin(getThisCodebaseRootDirPath(), "src"),
  });

  const thisParsedPackageJson = JSON.parse(
    fs
      .readFileSync(pathJoin(getThisCodebaseRootDirPath(), "package.json"))
      .toString("utf8"),
  );

  const thisVersion: string = thisParsedPackageJson["version"];

  const keycloakVersion = thisVersion.split("-")[0];

  const fetchOptions = getProxyFetchOptions({
    npmConfigGetCwd: getThisCodebaseRootDirPath(),
  });

  const cacheDirPath = pathJoin(
    getThisCodebaseRootDirPath(),
    "node_modules",
    ".cache",
    "scripts",
  );

  const { extractedDirPath } = await downloadAndExtractArchive({
    url: `https://github.com/keycloak/keycloak/archive/refs/tags/${keycloakVersion}.zip`,
    cacheDirPath,
    fetchOptions,
    uniqueIdOfOnArchiveFile: "download_keycloak-account-ui-sources",
    onArchiveFile: async ({ fileRelativePath, readFile, writeFile }) => {
      fileRelativePath = fileRelativePath.split(pathSep).slice(1).join(pathSep);

      if (/\.test\.[a-z0-9]{2,3}/.test(fileRelativePath)) {
        return;
      }

      account_ui: {
        {
          const dirPath = pathJoin("js", "apps", "account-ui");

          if (
            !isInside({
              filePath: fileRelativePath,
              dirPath,
            })
          ) {
            break account_ui;
          }

          fileRelativePath = pathRelative(dirPath, fileRelativePath);
        }

        if (fileRelativePath === "package.json") {
          await writeFile({
            fileRelativePath: pathJoin("account-ui", "package.json"),
          });

          return;
        }

        {
          const dirPath = "src";

          if (
            !isInside({
              filePath: fileRelativePath,
              dirPath,
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

        if (
          fileRelativePath.endsWith(".ts") ||
          fileRelativePath.endsWith(".tsx")
        ) {
          modifiedSourceCode = sourceCode
            .replaceAll(
              /((?:from )|(?:import\())"(\.[./]*\/)/g,
              (_, p1, p2) =>
                `${p1}"@keycloakify/keycloak-account-ui/${pathJoin(
                  pathDirname(fileRelativePath),
                  p2.replace("/", pathSep),
                )
                  .replaceAll(pathSep, "/")
                  .replace(/^\.\//, "")}`,
            )
            .replaceAll(
              `"@keycloak/keycloak-ui-shared"`,
              `"@keycloakify/keycloak-account-ui/ui-shared"`,
            );

          if (fileRelativePath === "i18n.ts") {
            const modifiedSourceCode_before = modifiedSourceCode;
            modifiedSourceCode = modifiedSourceCode.replaceAll(
              "export const i18n",
              [
                `export function initI18n() { return i18n.init(); }`,
                "",
                "const i18n",
              ].join("\n"),
            );
            assert(modifiedSourceCode !== modifiedSourceCode_before);
          } else {
            const modifiedSourceCode_before = modifiedSourceCode;

            modifiedSourceCode = modifiedSourceCode.replaceAll(
              "i18n.",
              "getI18n().",
            );

            if (modifiedSourceCode_before !== modifiedSourceCode) {
              const modifiedSourceCode_before = modifiedSourceCode;

              modifiedSourceCode = modifiedSourceCode
                .split("\n")
                .map((line) => {
                  if (
                    !line.includes(
                      `from "@keycloakify/keycloak-account-ui/i18n";`,
                    )
                  ) {
                    return line;
                  }

                  const tokens = line
                    .split("{")[1]
                    .split("}")[0]
                    .split(",")
                    .map((token) => token.trim());

                  return `import { ${tokens.filter((t) => t !== "i18n")} } from "@keycloakify/keycloak-account-ui/i18n";`;
                })
                .join("\n");

              assert(modifiedSourceCode_before !== modifiedSourceCode);

              modifiedSourceCode = [
                `import { getI18n } from "react-i18next";`,
                modifiedSourceCode,
              ].join("\n");
            }
          }
        }

        await writeFile({
          fileRelativePath: pathJoin("account-ui", fileRelativePath),
          modifiedData:
            modifiedSourceCode === undefined
              ? undefined
              : Buffer.from(modifiedSourceCode, "utf8"),
        });
      }

      ui_shared: {
        {
          const dirPath = pathJoin("js", "libs", "ui-shared");

          if (
            !isInside({
              filePath: fileRelativePath,
              dirPath,
            })
          ) {
            break ui_shared;
          }

          fileRelativePath = pathRelative(dirPath, fileRelativePath);
        }

        if (fileRelativePath === "package.json") {
          await writeFile({
            fileRelativePath: pathJoin("ui-shared", "package.json"),
          });

          return;
        }

        {
          const dirPath = "src";

          if (
            !isInside({
              filePath: fileRelativePath,
              dirPath,
            })
          ) {
            return;
          }

          fileRelativePath = pathRelative(dirPath, fileRelativePath);
        }

        if (fileRelativePath === "vite-env.d.ts") {
          return;
        }

        const sourceCode = (await readFile()).toString("utf8");

        const modifiedSourceCode = sourceCode.replaceAll(
          /((?:from )|(?:import\())"(\.[./]*\/)/g,
          (_, p1, p2) =>
            `${p1}"@keycloakify/keycloak-account-ui/ui-shared/${pathJoin(
              pathDirname(fileRelativePath),
              p2.replace("/", pathSep),
            )
              .replaceAll(pathSep, "/")
              .replace(/^\.\//, "")}`,
        );

        await writeFile({
          fileRelativePath: pathJoin("ui-shared", fileRelativePath),
          modifiedData: Buffer.from(modifiedSourceCode, "utf8"),
        });

        if (fileRelativePath === "main.ts") {
          await writeFile({
            fileRelativePath: pathJoin("ui-shared", "index.ts"),
            modifiedData: Buffer.from(
              ["export * from './main';", ""].join("\n"),
              "utf8",
            ),
          });
        }
      }
    },
  });

  {
    const publicDirPath = pathJoin(
      getThisCodebaseRootDirPath(),
      "src",
      "public",
    );

    if (!fs.existsSync(publicDirPath)) {
      fs.mkdirSync(publicDirPath);
    }

    (["logo.svg", "content.json"] as const).map(async (fileBasename) => {
      const response = await fetch(
        `https://raw.githubusercontent.com/keycloak/keycloak/${keycloakVersion}/js/apps/account-ui/public/${fileBasename}`,
        fetchOptions,
      );

      const content = await response.text();

      const { targetFileBasename, targetContent } = await (async () => {
        switch (fileBasename) {
          case "logo.svg":
            return {
              targetFileBasename: "logo.svg",
              targetContent: content,
            };
          case "content.json":
            return {
              targetFileBasename: "content.ts",
              targetContent: [
                `const content = ${JSON.stringify(JSON.parse(content), null, 2)} as const;`,
                "export default content;",
              ].join("\n"),
            };
        }
        assert<Equals<typeof fileBasename, never>>(false);
      })();

      fs.writeFileSync(
        pathJoin(publicDirPath, targetFileBasename),
        Buffer.from(targetContent, "utf8"),
      );
    });
  }

  let keycloakAccountUiVersion: string | undefined;

  transformCodebase({
    srcDirPath: pathJoin(extractedDirPath, "account-ui"),
    destDirPath: pathJoin(getThisCodebaseRootDirPath(), "src"),
    transformSourceCode: ({ fileRelativePath, sourceCode }) => {
      if (fileRelativePath === "package.json") {
        keycloakAccountUiVersion = JSON.parse(sourceCode.toString("utf8"))[
          "version"
        ];

        return;
      }

      return { modifiedSourceCode: sourceCode };
    },
  });

  let keycloakUiSharedVersion: string | undefined;

  transformCodebase({
    srcDirPath: pathJoin(extractedDirPath, "ui-shared"),
    destDirPath: pathJoin(getThisCodebaseRootDirPath(), "src", "ui-shared"),
    transformSourceCode: ({ fileRelativePath, sourceCode }) => {
      if (fileRelativePath === "package.json") {
        keycloakUiSharedVersion = JSON.parse(sourceCode.toString("utf8"))[
          "version"
        ];

        return;
      }

      return { modifiedSourceCode: sourceCode };
    },
  });

  assert(typeof keycloakAccountUiVersion === "string");

  const parsedAccountUiPackageJson = await fetch(
    `https://unpkg.com/@keycloak/keycloak-account-ui@${keycloakAccountUiVersion}/package.json`,
    fetchOptions,
  ).then((response) => response.json());

  {
    const { extractedDirPath } = await downloadAndExtractArchive({
      url: `https://repo1.maven.org/maven2/org/keycloak/keycloak-account-ui/${keycloakVersion}/keycloak-account-ui-${keycloakUiSharedVersion}.jar`,
      cacheDirPath,
      fetchOptions,
      uniqueIdOfOnArchiveFile: "bring_in_account_v3_i18n_messages",
      onArchiveFile: async ({ fileRelativePath, writeFile }) => {
        if (
          !fileRelativePath.startsWith(
            pathJoin("theme", "keycloak.v3", "account", "messages"),
          )
        ) {
          return;
        }
        await writeFile({
          fileRelativePath: pathBasename(fileRelativePath),
        });
      },
    });

    transformCodebase({
      srcDirPath: extractedDirPath,
      destDirPath: pathJoin(getThisCodebaseRootDirPath(), "messages"),
    });
  }

  let devDependenciesToInstall: Record<string, string> | undefined = undefined;

  {
    for (const name of Object.keys(thisParsedPackageJson["peerDependencies"])) {
      delete thisParsedPackageJson["devDependencies"][name];
    }

    const parsedSharedUiPackageJson = await fetch(
      `https://unpkg.com/@keycloak/keycloak-ui-shared@${keycloakUiSharedVersion}/package.json`,
      fetchOptions,
    ).then((response) => response.json());

    thisParsedPackageJson["peerDependencies"] = Object.fromEntries(
      Object.entries({
        ...parsedAccountUiPackageJson["dependencies"],
        ...parsedSharedUiPackageJson["dependencies"],
      }).filter(
        ([name]) =>
          name !== "react" &&
          name !== "react-dom" &&
          name !== parsedSharedUiPackageJson["name"],
      ),
    );

    devDependenciesToInstall = {};

    for (const name of Object.keys(thisParsedPackageJson["peerDependencies"])) {
      const typeName = name.startsWith("@")
        ? `@types/${name.substring(1).replace("/", "__")}`
        : `@types/${name}`;

      const versionRange = {
        ...parsedAccountUiPackageJson["devDependencies"],
        ...parsedSharedUiPackageJson["devDependencies"],
      }[typeName];

      if (versionRange === undefined) {
        continue;
      }

      devDependenciesToInstall[typeName] = versionRange;
    }

    Object.assign(thisParsedPackageJson["devDependencies"], {
      ...thisParsedPackageJson["peerDependencies"],
      ...devDependenciesToInstall,
    });
  }

  fs.writeFileSync(
    pathJoin(getThisCodebaseRootDirPath(), "package.json"),
    JSON.stringify(thisParsedPackageJson, undefined, 2),
  );

  child_process.execSync("yarn install --ignore-scripts", {
    cwd: getThisCodebaseRootDirPath(),
    stdio: "ignore",
  });

  child_process.execSync("yarn format", {
    cwd: getThisCodebaseRootDirPath(),
    stdio: "ignore",
  });

  fs.writeFileSync(
    pathJoin(getThisCodebaseRootDirPath(), "dependencies.gen.json"),
    Buffer.from(
      JSON.stringify(
        {
          dependencies: thisParsedPackageJson["peerDependencies"],
          devDependencies: devDependenciesToInstall,
        },
        null,
        2,
      ),
      "utf8",
    ),
  );

  const readme = fs
    .readFileSync(pathJoin(__dirname, "README-template.md"))
    .toString("utf8")
    .replaceAll("{{ACCOUNT_UI_VERSION}}", keycloakAccountUiVersion)
    .replaceAll("{{KEYCLOAK_VERSION}}", keycloakVersion)
    .replaceAll("{{THIS_VERSION}}", thisVersion)
    .replaceAll(
      "{{DEPENDENCIES}}",
      JSON.stringify(
        {
          dependencies: {
            [thisParsedPackageJson["name"]]: thisVersion,
            ...thisParsedPackageJson["peerDependencies"],
          },
          devDependencies: devDependenciesToInstall,
        },
        null,
        2,
      ),
    );

  fs.writeFileSync(
    pathJoin(getThisCodebaseRootDirPath(), "README.md"),
    Buffer.from(readme, "utf8"),
  );

  child_process.execSync("yarn format");

  console.log(
    chalk.green(
      `\n\nPulled @keycloak/keycloak-account-ui@${keycloakAccountUiVersion} from keycloak version ${keycloakVersion}`,
    ),
  );
})();
