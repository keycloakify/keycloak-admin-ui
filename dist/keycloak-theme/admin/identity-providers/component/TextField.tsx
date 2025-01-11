/* eslint-disable */

// @ts-nocheck

import { TextInput } from "../../../shared/@patternfly/react-core";
import { useFormContext } from "react-hook-form";

import { FieldProps, FormGroupField } from "./FormGroupField";

export const TextField = ({ label, field, isReadOnly = false }: FieldProps) => {
  const { register } = useFormContext();
  return (
    <FormGroupField label={label}>
      <TextInput
        id={label}
        data-testid={label}
        readOnly={isReadOnly}
        {...register(field)}
      />
    </FormGroupField>
  );
};
