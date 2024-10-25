/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-namespace */
import { Suspense, useMemo, type LazyExoticComponent } from "react";
import { assert } from "tsafe/assert";
import { is } from "tsafe/is";
import type { Environment } from "@keycloakify/keycloak-admin-ui/environment";
import { joinPath } from "@keycloakify/keycloak-admin-ui/utils/joinPath";
import defaultLogoSvgUrl from "@keycloakify/keycloak-admin-ui/public/logo.svg";

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
  logoUrl?: string;
  loadingFallback?: JSX.Element;
};

export function KcAdminUiLoader(props: KcAdminUiLoaderProps) {
  const { KcAdminUi, loadingFallback, ...paramsOfInit } = props;

  assert(is<LazyExoticComponent<() => JSX.Element | null>>(KcAdminUi));

  useMemo(() => init(paramsOfInit), []);

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

function init(
  params: Pick<KcAdminUiLoaderProps, "kcContext" | "logoUrl">,
) {
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

  const logoUrl = (() => {
    if (params.logoUrl?.startsWith("data:")) {
      const error = new Error(
        [
          `ERROR: The logo url can't be a data url.`,
          `Due to the fact your logo is very small it has been inlined in the bundle.`,
          `The logoUrl you passed is: ${params.logoUrl.substring(0, 25)}...`,
          `To fix this issue you can put the logo in the public directory and import it like:`,
          `logoUrl={\`\${${["import", "meta", "env", "BASE_URL"].join(".")}}assets/logo.svg\`} if you are using Vite or`,
          `logoUrl={\`\${process.env.PUBLIC_URL}/assets/logo.svg\`} if you are using Webpack (CRA).`,
          `If it's an SVG you can also pad it's size with random \`<!-- xxx -->\` comments to make it bigger that it passes the threshold of 4KB.`,
        ].join("\n"),
      );
      alert(error.message);
      throw error;
    }

    const logoUrl_params = params.logoUrl ?? defaultLogoSvgUrl;

    const url = new URL(
      logoUrl_params.startsWith("http")
        ? logoUrl_params
        : joinPath(window.location.origin, logoUrl_params),
    );

    return url.href.substring(url.origin.length);
  })();

  const resourceUrl = kcContext.resourceUrl;

  if (!logoUrl.startsWith(resourceUrl)) {
    const error = new Error(`ERROR: The logo url can't be an external url.`);
    alert(error.message);
    throw error;
  }


  const referrerUrl = readQueryParamOrRestoreFromSessionStorage({
    name: "referrer_uri",
  });

  const environment = {
    serverBaseUrl: kcContext.serverBaseUrl,
    adminBaseUrl: kcContext.adminBaseUrl,
    authUrl: kcContext.authUrl,
    authServerUrl: kcContext.authServerUrl,
    realm: kcContext.loginRealm ?? "master",
    clientId: kcContext.clientId,
    resourceUrl: kcContext.resourceUrl,
    logo: logoUrl.substring(resourceUrl.length),
    logoUrl:
      referrerUrl === undefined ? "/" : referrerUrl.replace("_hash_", "#"),
    consoleBaseUrl: kcContext.consoleBaseUrl,
    masterRealm: kcContext.masterRealm,
    resourceVersion: kcContext.resourceVersion,
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

function readQueryParamOrRestoreFromSessionStorage(params: {
  name: string;
}): string | undefined {
  const { name } = params;

  const url = new URL(window.location.href);

  const value = url.searchParams.get(name);

  const PREFIX = "keycloakify:";

  if (value !== null) {
    sessionStorage.setItem(`${PREFIX}${name}`, value);
    url.searchParams.delete(name);
    window.history.replaceState({}, "", url.toString());
    return value;
  }

  return sessionStorage.getItem(`${PREFIX}${name}`) ?? undefined;
}
