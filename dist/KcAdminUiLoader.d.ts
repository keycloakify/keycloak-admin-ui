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
type LazyExoticComponentLike = {
    _result: unknown;
};
export type KcAdminUiLoaderProps = {
    kcContext: KcContextLike;
    KcAdminUi: LazyExoticComponentLike;
    loadingFallback?: ReactElement<any, any>;
    /** @deprecated: Use darkModePolicy instead*/
    enableDarkModeIfPreferred?: boolean;
    /**
     * Dark mode rendering policy:
     * - "auto": Follow system preference, unless the Admin Console disables dark mode (then force light mode).
     * - "never dark mode": Always render in light mode.
     *
     * Default: "auto"
     *
     * Implementation detail:
     * Dark mode is enabled by adding the CSS class `"pf-v5-theme-dark"` to the root <html> element.
     * If the class is absent, the app renders in light mode.
     *
     * Custom management:
     * To control dark/light mode yourself, set `darkModePolicy: "never dark mode"`.
     * This makes the loader a no-op (it won’t add/remove any class).
     * You must then handle toggling `"pf-v5-theme-dark"` on <html class="..."> manually.
     *
     * Important: Always respect `kcContext.darkMode`.
     * - If `kcContext.darkMode === false`, dark mode is forbidden by the server (cannot be enabled).
     * - If `kcContext.darkMode === undefined` (older Keycloak), treat it as `true`
     *   — meaning dark mode is allowed.
     */
    darkModePolicy?: "auto" | "never dark mode";
};
export declare function KcAdminUiLoader(props: KcAdminUiLoaderProps): import("react/jsx-runtime").JSX.Element;
export {};
