/* eslint-disable */

// @ts-nocheck

import GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation";
import {
  FormErrorText,
  HelpItem,
  SelectVariant,
  useFetch,
} from "../../../shared/keycloak-ui-shared";
import { Button, FormGroup } from "../../../shared/@patternfly/react-core";
import { MinusCircleIcon } from "../../../shared/@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../../shared/@patternfly/react-table";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useAdminClient } from "../../admin-client";
import type { ComponentProps } from "../../components/dynamic/components";
import { GroupPickerDialog } from "../../components/group/GroupPickerDialog";

type GroupSelectProps = Omit<ComponentProps, "convertToName"> & {
  variant?: `${SelectVariant}`;
  isRequired?: boolean;
};

const convertGroups = (groups: GroupRepresentation[]): string[] =>
  groups.map(({ id }) => id!);

export const GroupSelect = ({
  name,
  label,
  helpText,
  defaultValue,
  isDisabled = false,
  isRequired,
}: GroupSelectProps) => {
  const { adminClient } = useAdminClient();
  const { t } = useTranslation();
  const {
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext();
  const values: string[] = getValues(name!);
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<GroupRepresentation[]>([]);

  useFetch(
    () => {
      if (values && values.length > 0) {
        return Promise.all(
          (values as string[]).map((id) => adminClient.groups.findOne({ id })),
        );
      }
      return Promise.resolve([]);
    },
    (groups) => {
      setGroups(groups.flat().filter((g) => g) as GroupRepresentation[]);
    },
    [],
  );

  return (
    <FormGroup
      label={t(label!)}
      labelIcon={<HelpItem helpText={t(helpText!)} fieldLabelId="groups" />}
      fieldId="groups"
      isRequired={isRequired}
    >
      <Controller
        name={name!}
        control={control}
        defaultValue={defaultValue}
        rules={
          isRequired
            ? {
                validate: (value?: GroupRepresentation[]) =>
                  value && value.length > 0,
              }
            : undefined
        }
        render={({ field }) => (
          <>
            {open && (
              <GroupPickerDialog
                type="selectMany"
                text={{
                  title: "addGroupsToGroupPolicy",
                  ok: "add",
                }}
                onConfirm={(selectGroup) => {
                  field.onChange([
                    ...(field.value || []),
                    ...convertGroups(selectGroup || []),
                  ]);
                  setGroups([...groups, ...(selectGroup || [])]);
                  setOpen(false);
                }}
                onClose={() => {
                  setOpen(false);
                }}
                filterGroups={groups}
              />
            )}
            <Button
              data-testid="select-group-button"
              isDisabled={isDisabled}
              variant="secondary"
              onClick={() => {
                setOpen(true);
              }}
            >
              {t("addGroups")}
            </Button>
          </>
        )}
      />
      {groups.length > 0 && (
        <Table variant="compact">
          <Thead>
            <Tr>
              <Th>{t("groups")}</Th>
              <Th aria-hidden="true" />
            </Tr>
          </Thead>
          <Tbody>
            {groups.map((group) => (
              <Tr key={group.id}>
                <Td>{group.path}</Td>
                <Td>
                  <Button
                    variant="link"
                    className="keycloak__client-authorization__policy-row-remove"
                    icon={<MinusCircleIcon />}
                    onClick={() => {
                      setValue(name!, [
                        ...convertGroups(
                          (groups || []).filter(({ id }) => id !== group.id),
                        ),
                      ]);
                      setGroups([
                        ...groups.filter(({ id }) => id !== group.id),
                      ]);
                    }}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
      {errors.groups && <FormErrorText message={t("requiredGroups")} />}
    </FormGroup>
  );
};
