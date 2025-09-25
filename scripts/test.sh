#!/bin/bash

rm -rf dist node_modules
yarn
yarn build


rm -rf keycloakify-starter
git clone https://github.com/keycloakify/keycloakify-starter
cd keycloakify-starter
yarn

npx keycloakify initialize-admin-theme

rm -r node_modules/@keycloakify/keycloak-admin-ui
cp -r ../dist node_modules/@keycloakify/keycloak-admin-ui
rm -r node_modules/.cache
cd keycloakify-starter
node -e "\
    const fs = require('fs');\
    const pj_path= './node_modules/@keycloakify/keycloak-admin-ui/package.json';
    const pj = JSON.parse(fs.readFileSync(pj_path, 'utf8'));\
    pj.version = JSON.parse(fs.readFileSync('package.json', 'utf8')).dependencies['@keycloakify/keycloak-admin-ui'].slice(1);\
    fs.writeFileSync(pj_path, Buffer.from(JSON.stringify(pj, null, 2), 'utf8'));\
"

yarn postinstall

npx keycloakify start-keycloak
