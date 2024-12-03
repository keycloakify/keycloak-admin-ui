import "@patternfly/patternfly/patternfly-addons.css";
import "@patternfly/react-core/dist/styles/base.css";
import "./index.css";
import { useEffect, useReducer } from "react";
import { initializeDarkMode } from "@keycloakify/keycloak-admin-ui/ui-shared";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { initI18n } from "@keycloakify/keycloak-admin-ui/i18n/i18n";
import { routes } from "@keycloakify/keycloak-admin-ui/routes";

const router = createBrowserRouter(routes);
const prI18nInitialized = initI18n();

initializeDarkMode();

export default function KcAdminUi() {
    const [isI18nInitialized, setI18nInitialized] = useReducer(() => true, false);

    useEffect(() => {
        prI18nInitialized.then(() => setI18nInitialized());
    }, []);

    if (!isI18nInitialized) {
        return null;
    }

    return <RouterProvider router={router} />;
}
