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
};
type LazyExoticComponentLike = {
    _result: unknown;
};
export type KcAdminUiLoaderProps = {
    kcContext: KcContextLike;
    KcAdminUi: LazyExoticComponentLike;
    loadingFallback?: JSX.Element;
};
export declare function KcAdminUiLoader(props: KcAdminUiLoaderProps): import("react/jsx-runtime").JSX.Element;
export {};
