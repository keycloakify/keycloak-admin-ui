/* eslint-disable */

// @ts-nocheck

import { KeycloakSelect } from "../../../../shared/keycloak-ui-shared";
import { SelectOption } from "../../../../shared/@patternfly/react-core";
import { useState } from "react";
import { UseControllerProps, useController } from "react-hook-form";
import { useTranslation } from "react-i18next";

type ValueSelectProps = UseControllerProps & {
  selectItems: string[];
};

export const ValueSelect = ({ selectItems, ...rest }: ValueSelectProps) => {
  const { t } = useTranslation();
  const { field } = useController(rest);
  const [open, setOpen] = useState(false);

  return (
    <KeycloakSelect
      onToggle={(isOpen) => setOpen(isOpen)}
      isOpen={open}
      onSelect={(value) => {
        field.onChange(value);
        setOpen(false);
      }}
      selections={field.value ? [field.value] : t("choose")}
      placeholderText={t("valuePlaceholder")}
    >
      {selectItems.map((item) => (
        <SelectOption key={item} value={item}>
          {item}
        </SelectOption>
      ))}
    </KeycloakSelect>
  );
};
