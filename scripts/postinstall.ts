import { join as pathJoin } from "path";
import { getThisCodebaseRootDirPath } from "./tools/getThisCodebaseRootDirPath";
import { assert, is, type Equals } from "tsafe/assert";
import * as fs from "fs";
import { id } from "tsafe/id";
import { z } from "zod";

const { parsedPackageJson } = (() => {
    type ParsedPackageJson = {
        version: string;
        devDependencies: Record<string, string>;
    };

    const zParsedPackageJson = (() => {
        type TargetType = ParsedPackageJson;

        const zTargetType = z.object({
            version: z.string(),
            devDependencies: z.record(z.string())
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

const moduleName = "@keycloak/keycloak-admin-ui";

assert(
    parsedPackageJson.devDependencies[moduleName] === keycloakVersion,
    `Need to bump ${moduleName} to ${keycloakVersion}`
);
