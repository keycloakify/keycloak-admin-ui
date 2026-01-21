import { Suspense, useMemo, type LazyExoticComponent, type ReactElement } from "react";
import { assert, is, type Equals } from "tsafe/assert";
//import type { AccountEnvironment as Environment_target } from "@keycloak/keycloak-admin-ui";

type Environment = {
    serverBaseUrl: string;
    realm: string;
    clientId: string;
    resourceUrl: string;
    logo: string;
    logoUrl: string;
    adminBaseUrl: string;
    consoleBaseUrl: string;
    masterRealm: string;
    resourceVersion: string;
};

//assert<Equals<Environment, Environment_target>>;

export type KcContextLike = {
    serverBaseUrl?: string;
    adminBaseUrl?: string;
    authUrl: string;
    authServerUrl: string;
    loginRealm?: string; // "master"
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

let kcContext_global: KcContextLike | undefined = undefined;

export function createGetKcContext<KcContext extends KcContextLike>() {
    function getKcContext(): { kcContext: KcContext } {
        if (kcContext_global === undefined) {
            throw new Error("getKcContext can only be called once KcAdminUi has been loaded");
        }

        assert<Equals<typeof kcContext_global, KcContextLike>>;
        assert(is<KcContext>(kcContext_global));

        return { kcContext: kcContext_global };
    }

    return { getKcContext };
}

type LazyExoticComponentLike = {
    _result: unknown;
};

export type KcAdminUiLoaderProps = {
    kcContext: KcContextLike;
    KcAdminUi: LazyExoticComponentLike;
    loadingFallback?: ReactElement<any, any>;
};

export function KcAdminUiLoader(props: KcAdminUiLoaderProps) {
    const { kcContext, KcAdminUi, loadingFallback } = props;

    assert(is<LazyExoticComponent<() => ReactElement<any, any> | null>>(KcAdminUi));

    useMemo(() => {
        try {
            init({
                kcContext
            });
        } catch (error) {
            // NOTE: The error can be "swallowed" by React
            setTimeout(() => {
                throw error;
            }, 0);
        }
    }, []);

    return (
        <Suspense fallback={loadingFallback}>
            {(() => {
                const node = <KcAdminUi />;

                if (node === null) {
                    return loadingFallback;
                }

                return node;
            })()}
        </Suspense>
    );
}

let previousRunParamsFingerprint: string | undefined = undefined;

function init(params: { kcContext: KcContextLike }) {
    exit_condition: {
        const paramsFingerprint = JSON.stringify(params);

        if (previousRunParamsFingerprint === undefined) {
            previousRunParamsFingerprint = paramsFingerprint;
            break exit_condition;
        }

        if (paramsFingerprint !== previousRunParamsFingerprint) {
            window.location.reload();
            return;
        }

        return;
    }

    const { kcContext } = params;

    kcContext_global = kcContext;

    const environment = {
        serverBaseUrl: kcContext.serverBaseUrl ?? kcContext.authServerUrl,
        adminBaseUrl: kcContext.adminBaseUrl ?? kcContext.authServerUrl,
        authUrl: kcContext.authUrl,
        authServerUrl: kcContext.authServerUrl,
        realm: kcContext.loginRealm ?? "master",
        clientId: kcContext.clientId ?? "security-admin-console",
        resourceUrl: kcContext.resourceUrl,
        logo: "",
        logoUrl: "",
        consoleBaseUrl: kcContext.consoleBaseUrl,
        masterRealm: kcContext.masterRealm,
        resourceVersion: kcContext.resourceVersion
    };

    {
        const undefinedKeys = Object.entries(environment)
            .filter(([, value]) => value === undefined)
            .map(([key]) => key);

        if (undefinedKeys.length > 0) {
            console.error("Need KcContext polyfill for ", undefinedKeys.join(", "));
        }
    }

    {
        assert<typeof environment extends Environment ? true : false>();

        const script = document.createElement("script");
        script.id = "environment";
        script.type = "application/json";
        script.textContent = JSON.stringify(environment, null, 1);

        document.body.appendChild(script);
    }

    const realFetch = window.fetch.bind(window);

    window.fetch = (...args) => {
        intercept: {
            const [url, ...rest] = args;

            const parsedUrl = (() => {
                if (url instanceof URL) {
                    return url;
                }

                if (typeof url === "string") {
                    return new URL(url.startsWith("/") ? `${window.location.origin}${url}` : url);
                }

                return undefined;
            })();

            if (parsedUrl === undefined) {
                break intercept;
            }

            patch_1: {
                if (kcContext.serverBaseUrl !== undefined) {
                    break patch_1;
                }

                const prefix = `/admin/realms/${environment.realm}/ui-ext/`;

                if (!parsedUrl.pathname.startsWith(prefix)) {
                    break patch_1;
                }

                const newPathname = parsedUrl.pathname
                    .replace("ui-ext/", "")
                    .replace("/authentication-management/", "/authentication/");

                parsedUrl.pathname = newPathname;

                return realFetch(parsedUrl.toString(), ...rest);
            }
        }

        return realFetch(...args);
    };

    inject_kc_context_properties_styles_if_any: {
        const { styles } = kcContext.properties;

        if (!styles) {
            break inject_kc_context_properties_styles_if_any;
        }

        const relativeUrls = styles.split(" ").map(s => s.trim());

        if (relativeUrls.length === 0) {
            break inject_kc_context_properties_styles_if_any;
        }

        const { appendLinksToHead, removeLinksFromHead } = (() => {
            const CUSTOM_ATTRIBUTE_NAME = "data-properties-styles";

            const links = relativeUrls.map(relativeUrl => {
                const url = `${kcContext.serverBaseUrl}${kcContext.resourceUrl}/${relativeUrl}`;

                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = url;
                link.setAttribute(CUSTOM_ATTRIBUTE_NAME, "true");

                return link;
            });

            function appendLinksToHead() {
                links.forEach(link => {
                    document.head.appendChild(link);
                });
            }

            function removeLinksFromHead() {
                document.querySelectorAll(`link[${CUSTOM_ATTRIBUTE_NAME}="true"]`).forEach(link => {
                    link.remove();
                });
            }

            return { appendLinksToHead, removeLinksFromHead };
        })();

        appendLinksToHead();

        (function callee() {
            const observer = new MutationObserver(mutations => {
                const hasAddedNodes = (() => {
                    for (const mutation of mutations) {
                        if (mutation.addedNodes.length !== 0) {
                            return true;
                        }
                    }

                    return false;
                })();

                if (!hasAddedNodes) {
                    return;
                }

                observer.disconnect();

                removeLinksFromHead();
                appendLinksToHead();

                callee();
            });

            observer.observe(document.head, {
                childList: true,
                subtree: false
            });
        })();
    }
}
