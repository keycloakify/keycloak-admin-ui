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
    var _a;
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
        serverBaseUrl: kcContext.serverBaseUrl,
        adminBaseUrl: kcContext.adminBaseUrl,
        authUrl: kcContext.authUrl,
        authServerUrl: kcContext.authServerUrl,
        realm: (_a = kcContext.loginRealm) !== null && _a !== void 0 ? _a : "master",
        clientId: kcContext.clientId,
        resourceUrl: kcContext.resourceUrl,
        logo: "",
        logoUrl: "",
        consoleBaseUrl: kcContext.consoleBaseUrl,
        masterRealm: kcContext.masterRealm,
        resourceVersion: kcContext.resourceVersion
    };
    {
        assert();
        const script = document.createElement("script");
        script.id = "environment";
        script.type = "application/json";
        script.textContent = JSON.stringify(environment, null, 1);
        document.body.appendChild(script);
    }
}
//# sourceMappingURL=KcAdminUiLoader.js.map