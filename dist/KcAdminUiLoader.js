import { jsx as _jsx } from "react/jsx-runtime";
import { Suspense, useMemo } from "react";
import { assert, is } from "tsafe/assert";
export function KcAdminUiLoader(props) {
    const { kcContext, KcAdminUi, loadingFallback } = props;
    assert(is(KcAdminUi));
    useMemo(() => init({ kcContext }), []);
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
    const { kcContext } = params;
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
}
//# sourceMappingURL=KcAdminUiLoader.js.map