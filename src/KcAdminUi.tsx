import { useEffect, useReducer } from "react";
import "@patternfly/react-core/dist/styles/base.css";
import "@patternfly/patternfly/patternfly-addons.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { initI18n } from "@keycloakify/keycloak-account-ui/i18n";
import { routes } from "@keycloakify/keycloak-account-ui/routes";

const router = createBrowserRouter(routes);
const prI18nInitialized = initI18n();

export default function KeycloakAccountUi() {
  const [isI18nInitialized, setI18nInitialized] = useReducer(() => true, false);

  useEffect(() => {
    prI18nInitialized.then(() => setI18nInitialized());
  }, []);

  if (!isI18nInitialized) {
    return null;
  }

  return <RouterProvider router={router} />;
}
