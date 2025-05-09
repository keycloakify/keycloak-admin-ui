import { Suspense, useMemo, type LazyExoticComponent, type ReactElement } from "react";
import { assert, is } from "tsafe/assert";
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

export function KcAdminUiLoader(props: KcAdminUiLoaderProps) {
    const { kcContext, KcAdminUi, loadingFallback, enableDarkModeIfPreferred = true } = props;

    assert(is<LazyExoticComponent<() => ReactElement<any, any> | null>>(KcAdminUi));

    useMemo(() => init({ kcContext, enableDarkModeIfPreferred }), []);

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

function init(params: { kcContext: KcContextLike; enableDarkModeIfPreferred: boolean }) {
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

        function updateDarkMode(isEnabled: boolean) {
            const { classList } = document.documentElement;

            if (isEnabled) {
                classList.add(DARK_MODE_CLASS);
            } else {
                classList.remove(DARK_MODE_CLASS);
            }
        }
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
}
