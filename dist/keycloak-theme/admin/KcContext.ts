import { type KcContextLike, createGetKcContext } from "@keycloakify/keycloak-admin-ui";
import type { KcEnvName } from "../kc.gen";

export type KcContext = KcContextLike & {
    themeType: "admin";
    themeName: string;
    properties: Record<KcEnvName, string>;
};

export const { getKcContext } = createGetKcContext<KcContext>();
