#!/bin/bash

rm -rf dist node_modules
yarn
yarn build


rm -rf keycloakify-starter
git clone https://github.com/keycloakify/keycloakify-starter
cd keycloakify-starter
yarn

npx keycloakify initialize-admin-theme

# Point the dependency to the local build so postinstall uses it.
node -e "\
    const fs = require('fs');\
    const pjPath = './package.json';\
    const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'));\
    pj.dependencies = pj.dependencies || {};\
    pj.dependencies['@keycloakify/keycloak-admin-ui'] = 'file:../dist';\
    fs.writeFileSync(pjPath, Buffer.from(JSON.stringify(pj, null, 2), 'utf8'));\
"

yarn install

yarn postinstall

npx keycloakify start-keycloak
