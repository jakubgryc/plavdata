import { Badge, Flex, Select, Switch, Table } from "@mantine/core";
import type { ChangeEvent } from "react";
import { memo, useCallback } from "react";
import type { Swimmer, SwimmerEdits } from "../../schema/swimmers";

interface SwimmerRowProps {
  swimmer: Swimmer;
  groupOptions: Array<{ value: string; label: string }>;
  edits: SwimmerEdits | undefined;
  onEdit: (swimmerId: number, field: keyof SwimmerEdits, value: any) => void;
}

export const SwimmerRow = memo(function SwimmerRow({
  swimmer,
  groupOptions,
  edits,
  onEdit,
}: SwimmerRowProps) {
  // Current values (edited or original)
  const currentGroupId = edits?.group_id !== undefined ? edits.group_id : swimmer.group_id;
  const currentComparison =
    edits?.show_in_comparison !== undefined ? edits.show_in_comparison : swimmer.show_in_comparison;
  const currentPersonalBests =
    edits?.show_in_personal_bests !== undefined
      ? edits.show_in_personal_bests
      : swimmer.show_in_personal_bests;
  const currentRelayBuilder =
    edits?.show_in_relay_builder !== undefined
      ? edits.show_in_relay_builder
      : swimmer.show_in_relay_builder;

  // Check if each field has been edited
  const isGroupEdited = edits?.group_id !== undefined && edits.group_id !== swimmer.group_id;
  const isComparisonEdited =
    edits?.show_in_comparison !== undefined &&
    edits.show_in_comparison !== swimmer.show_in_comparison;
  const isPersonalBestsEdited =
    edits?.show_in_personal_bests !== undefined &&
    edits.show_in_personal_bests !== swimmer.show_in_personal_bests;
  const isRelayBuilderEdited =
    edits?.show_in_relay_builder !== undefined &&
    edits.show_in_relay_builder !== swimmer.show_in_relay_builder;

  const hasAnyEdit =
    isGroupEdited || isComparisonEdited || isPersonalBestsEdited || isRelayBuilderEdited;

  const handleGroupChange = useCallback(
    (value: string | null) => {
      const newGroupId = value ? parseInt(value, 10) : null;
      onEdit(swimmer.id, "group_id", newGroupId);
    },
    [swimmer.id, onEdit],
  );

  const handleComparisonChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onEdit(swimmer.id, "show_in_comparison", event.currentTarget.checked);
    },
    [swimmer.id, onEdit],
  );

  const handlePersonalBestsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onEdit(swimmer.id, "show_in_personal_bests", event.currentTarget.checked);
    },
    [swimmer.id, onEdit],
  );

  const handleRelayBuilderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onEdit(swimmer.id, "show_in_relay_builder", event.currentTarget.checked);
    },
    [swimmer.id, onEdit],
  );

  return (
    <Table.Tr style={hasAnyEdit ? { backgroundColor: "rgba(255, 236, 153, 0.15)" } : undefined}>
      <Table.Td fw={500} style={{ minWidth: 120 }}>
        {swimmer.surname}
      </Table.Td>
      <Table.Td style={{ minWidth: 100 }}>{swimmer.name}</Table.Td>
      <Table.Td ta="center" style={{ minWidth: 60 }}>
        {swimmer.birth_year}
      </Table.Td>
      <Table.Td style={{ minWidth: 120 }}>
        <Select
          size="xs"
          data={groupOptions}
          value={currentGroupId?.toString() ?? ""}
          onChange={handleGroupChange}
          placeholder="Bez skupiny"
          styles={
            isGroupEdited
              ? {
                  input: {
                    backgroundColor: "rgba(255, 236, 153, 0.3)",
                    borderColor: "rgba(250, 200, 60, 0.6)",
                  },
                }
              : undefined
          }
          comboboxProps={{ withinPortal: true }}
        />
      </Table.Td>
      <Table.Td style={{ minWidth: 90 }}>
        <Flex justify="center">
          <Switch
            checked={currentComparison}
            onChange={handleComparisonChange}
            size="sm"
            styles={
              isComparisonEdited
                ? {
                    track: {
                      backgroundColor: currentComparison ? undefined : "rgba(250, 200, 60, 0.5)",
                    },
                  }
                : undefined
            }
          />
        </Flex>
      </Table.Td>
      <Table.Td style={{ minWidth: 90 }}>
        <Flex justify="center">
          <Switch
            checked={currentPersonalBests}
            onChange={handlePersonalBestsChange}
            size="sm"
            styles={
              isPersonalBestsEdited
                ? {
                    track: {
                      backgroundColor: currentPersonalBests ? undefined : "rgba(250, 200, 60, 0.5)",
                    },
                  }
                : undefined
            }
          />
        </Flex>
      </Table.Td>
      <Table.Td style={{ minWidth: 90 }}>
        <Flex justify="center">
          <Switch
            checked={currentRelayBuilder}
            onChange={handleRelayBuilderChange}
            size="sm"
            styles={
              isRelayBuilderEdited
                ? {
                    track: {
                      backgroundColor: currentRelayBuilder ? undefined : "rgba(250, 200, 60, 0.5)",
                    },
                  }
                : undefined
            }
          />
        </Flex>
      </Table.Td>
      <Table.Td ta="center" w={80}>
        <Badge color="yellow" size="xs" style={{ visibility: hasAnyEdit ? "visible" : "hidden" }}>
          Upraveno
        </Badge>
      </Table.Td>
    </Table.Tr>
  );
});
