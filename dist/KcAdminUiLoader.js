import { jsx as _jsx } from "react/jsx-runtime";
import { Suspense, useMemo } from "react";
import { assert, is } from "tsafe/assert";
export function KcAdminUiLoader(props) {
    const { kcContext, KcAdminUi, loadingFallback, enableDarkModeIfPreferred = true } = props;
    assert(is(KcAdminUi));
    useMemo(() => init({ kcContext, enableDarkModeIfPreferred }), []);
    return (_jsx(Suspense, { fallback: loadingFallback, children: (() => {
            const node = _jsx(KcAdminUi, {});
            if (node === null) {
                return loadingFallback;
            }
            return node;
        })() }));
}
let previousRunParamsFingerprint = undefined;
function init(params) {
    var _a, _b, _c, _d;
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
    const { kcContext, enableDarkModeIfPreferred } = params;
    if (enableDarkModeIfPreferred) {
        const DARK_MODE_CLASS = "pf-v5-theme-dark";
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        updateDarkMode(mediaQuery.matches);
        mediaQuery.addEventListener("change", event => updateDarkMode(event.matches));
        function updateDarkMode(isEnabled) {
            const { classList } = document.documentElement;
            if (isEnabled) {
                classList.add(DARK_MODE_CLASS);
            }
            else {
                classList.remove(DARK_MODE_CLASS);
            }
        }
    }
    const environment = {
        serverBaseUrl: (_a = kcContext.serverBaseUrl) !== null && _a !== void 0 ? _a : kcContext.authServerUrl,
        adminBaseUrl: (_b = kcContext.adminBaseUrl) !== null && _b !== void 0 ? _b : kcContext.authServerUrl,
        authUrl: kcContext.authUrl,
        authServerUrl: kcContext.authServerUrl,
        realm: (_c = kcContext.loginRealm) !== null && _c !== void 0 ? _c : "master",
        clientId: (_d = kcContext.clientId) !== null && _d !== void 0 ? _d : "security-admin-console",
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
        assert();
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
//# sourceMappingURL=KcAdminUiLoader.js.map