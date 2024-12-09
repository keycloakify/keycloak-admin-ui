import "@patternfly/patternfly/patternfly-addons.css";
import "@patternfly/react-core/dist/styles/base.css";
import { useEffect, useReducer } from "react";
import { initializeDarkMode } from "../shared/keycloak-ui-shared";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { i18n } from "./i18n/i18n";
import { RootRoute } from "./routes";

import "./index.css";

const router = createHashRouter([RootRoute]);
const prI18nInitialized = i18n.init();

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
