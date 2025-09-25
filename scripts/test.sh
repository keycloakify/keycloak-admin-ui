#!/bin/bash

rm -rf dist node_modules
yarn
yarn build


rm -rf keycloakify-starter
git clone https://github.com/keycloakify/keycloakify-starter
cd keycloakify-starter
yarn
yarn add @keycloakify/keycloak-admin-ui
rm -rf node_modules/@keycloakify/keycloak-admin-ui
cp -r ../dist node_modules/@keycloakify/keycloak-admin-ui

git add -A
git commit -am "To delete"
npx keycloakify initialize-admin-theme

npx keycloakify start-keycloak
