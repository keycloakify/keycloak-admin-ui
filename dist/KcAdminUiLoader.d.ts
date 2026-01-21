import { type ReactElement } from "react";
export type KcContextLike = {
    serverBaseUrl?: string;
    adminBaseUrl?: string;
    authUrl: string;
    authServerUrl: string;
    loginRealm?: string;
    clientId?: string;
    resourceUrl: string;
    consoleBaseUrl: string;
    masterRealm: string;
    resourceVersion: string;
    properties: Record<string, string | undefined>;
    /**
     * Misleading name: this value does not indicate whether the app should render in dark or light mode.
     *
     * - If `darkMode === false`, the theme is NOT ALLOWED to render in dark mode under any circumstances.
     *   (Configured in the Admin Console.)
     * - If `darkMode === true`, dark mode is permitted.
     * - If `darkMode === undefined` (older Keycloak versions), assume `true`
     *   — meaning dark mode is allowed, since the restriction option didn’t exist yet.
     */
    darkMode?: boolean;
};
export declare function createGetKcContext<KcContext extends KcContextLike>(): {
    getKcContext: () => {
        kcContext: KcContext;
    };
};
type LazyExoticComponentLike = {
    _result: unknown;
};
export type KcAdminUiLoaderProps = {
    kcContext: KcContextLike;
    KcAdminUi: LazyExoticComponentLike;
    loadingFallback?: ReactElement<any, any>;
};
export declare function KcAdminUiLoader(props: KcAdminUiLoaderProps): import("react/jsx-runtime").JSX.Element;
export {};
