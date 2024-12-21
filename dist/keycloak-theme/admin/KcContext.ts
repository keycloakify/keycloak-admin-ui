import type { KcContextLike } from "@keycloakify/keycloak-admin-ui";
import type { KcEnvName } from "../kc.gen";

export type KcContext = KcContextLike & {
    themeType: "admin";
    themeName: string;
    properties: Record<KcEnvName, string>;
};
