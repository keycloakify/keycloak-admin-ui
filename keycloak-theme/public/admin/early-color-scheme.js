{

    const BACKGROUND_COLOR_DARK_MODE= "#121212";
    const BACKGROUND_COLOR_LIGHT_MODE = "#FFFFFF";
    const DARK_THEME_CLASS= "pf-v5-theme-dark";

    const isDarkModeEnabled = (() => {

        keycloak_policy: {
            if( typeof kcContext === "undefined" ){
                break keycloak_policy;
            }

            if( kcContext.darkMode !== false ){
                break keycloak_policy;
            }

            return false;
        }

        return matchMedia("(prefers-color-scheme: dark)").matches;
    })();

    {
        const element = document.createElement("style");

        element.id = "root-color-scheme-style";

        element.innerHTML = `:root { color-scheme: ${isDarkModeEnabled ? "dark" : "light"}; }`;

        document.head.appendChild(element);
    }

    document.documentElement.style.backgroundColor = isDarkModeEnabled
        ? BACKGROUND_COLOR_DARK_MODE
        : BACKGROUND_COLOR_LIGHT_MODE;

    if (isDarkModeEnabled) {
        document.documentElement.classList.add(DARK_THEME_CLASS);
    }

}