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

export function KcAdminUiLoader(props: KcAdminUiLoaderProps) {
    const { kcContext, KcAdminUi, loadingFallback, enableDarkModeIfPreferred, darkModePolicy } = props;

    assert(is<LazyExoticComponent<() => ReactElement<any, any> | null>>(KcAdminUi));

    if (enableDarkModeIfPreferred !== undefined) {
        kcContext.darkMode = enableDarkModeIfPreferred;
    }

    useMemo(
        () =>
            init({
                kcContext,
                darkModePolicy: (() => {
                    if (darkModePolicy !== undefined) {
                        assert(
                            enableDarkModeIfPreferred === undefined,
                            `Can't use both enableDarkModeIfPreferred and darkModePolicy, enableDarkModeIfPreferred is deprecated.`
                        );
                        return darkModePolicy;
                    }

                    if (enableDarkModeIfPreferred !== undefined) {
                        return enableDarkModeIfPreferred ? "auto" : "never dark mode";
                    }

                    return "auto";
                })()
            }),
        []
    );

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

function init(params: {
    kcContext: KcContextLike;
    darkModePolicy: NonNullable<KcAdminUiLoaderProps["darkModePolicy"]>;
}) {
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

    const { kcContext, darkModePolicy } = params;

    light_dark_mode_management: {
        if (darkModePolicy === "never dark mode") {
            break light_dark_mode_management;
        }

        assert<Equals<typeof darkModePolicy, "auto">>;

        if (kcContext.darkMode === false) {
            break light_dark_mode_management;
        }

        const setIsDarkModeEnabled = (params: { isDarkModeEnabled: boolean }) => {
            const { isDarkModeEnabled } = params;

            const { classList } = document.documentElement;

            const DARK_MODE_CLASS = "pf-v5-theme-dark";

            if (isDarkModeEnabled) {
                classList.add(DARK_MODE_CLASS);
            } else {
                classList.remove(DARK_MODE_CLASS);
            }
        };

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        if (mediaQuery.matches) {
            setIsDarkModeEnabled({ isDarkModeEnabled: true });
        }

        mediaQuery.addEventListener("change", event =>
            setIsDarkModeEnabled({ isDarkModeEnabled: event.matches })
        );
    }

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

    custom_styles: {
        const { styles } = kcContext.properties;

        if (!styles) {
            break custom_styles;
        }

        const relativeUrls = styles.split(" ").map(s => s.trim());

        if (relativeUrls.length === 0) {
            break custom_styles;
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
