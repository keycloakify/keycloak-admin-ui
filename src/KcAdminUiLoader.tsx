import { Suspense, useMemo, type LazyExoticComponent } from "react";
import { assert, is, type Equals } from "tsafe/assert";
import type { AccountEnvironment as Environment_target } from "@keycloak/keycloak-admin-ui";

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

assert<Equals<Environment, Environment_target>>;

export type KcContextLike = {
    serverBaseUrl: string;
    adminBaseUrl: string;
    authUrl: string;
    authServerUrl: string;
    loginRealm?: string; // "master"
    clientId: string;
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

export function KcAdminUiLoader(props: KcAdminUiLoaderProps) {
    const { kcContext, KcAdminUi, loadingFallback } = props;

    assert(is<LazyExoticComponent<() => JSX.Element | null>>(KcAdminUi));

    useMemo(() => init({ kcContext }), []);

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

    const environment = {
        serverBaseUrl: kcContext.serverBaseUrl,
        adminBaseUrl: kcContext.adminBaseUrl,
        authUrl: kcContext.authUrl,
        authServerUrl: kcContext.authServerUrl,
        realm: kcContext.loginRealm ?? "master",
        clientId: kcContext.clientId,
        resourceUrl: kcContext.resourceUrl,
        logo: "",
        logoUrl: "",
        consoleBaseUrl: kcContext.consoleBaseUrl,
        masterRealm: kcContext.masterRealm,
        resourceVersion: kcContext.resourceVersion
    };

    {
        assert<typeof environment extends Environment ? true : false>();

        const script = document.createElement("script");
        script.id = "environment";
        script.type = "application/json";
        script.textContent = JSON.stringify(environment, null, 1);

        document.body.appendChild(script);
    }
}
