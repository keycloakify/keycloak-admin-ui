/* eslint-disable */

// @ts-nocheck

import { label } from "../../shared/keycloak-ui-shared";
import { IFormatter, IFormatterValueType } from "../../shared/@patternfly/react-table";
import { TFunction } from "i18next";

export const translationFormatter =
  (t: TFunction): IFormatter =>
  (data?: IFormatterValueType) => {
    return data ? label(t, data as string) || "—" : "—";
  };
