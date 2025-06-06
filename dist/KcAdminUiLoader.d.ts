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
};
type LazyExoticComponentLike = {
    _result: unknown;
};
export type KcAdminUiLoaderProps = {
    kcContext: KcContextLike;
    KcAdminUi: LazyExoticComponentLike;
    loadingFallback?: ReactElement<any, any>;
    enableDarkModeIfPreferred?: boolean;
};
export declare function KcAdminUiLoader(props: KcAdminUiLoaderProps): import("react/jsx-runtime").JSX.Element;
export {};
