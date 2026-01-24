import "@patternfly/patternfly/patternfly-addons.css";
import "@patternfly/react-core/dist/styles/base.css";
import { useEffect, useReducer } from "react";
import { startColorSchemeManagement } from "./colorScheme";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { i18n } from "./i18n/i18n";
import { RootRoute } from "./routes";

import "./index.css";

document.title = "Keycloak Administration Console";

const router = createHashRouter([RootRoute]);
const prI18nInitialized = i18n.init();
startColorSchemeManagement();

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
