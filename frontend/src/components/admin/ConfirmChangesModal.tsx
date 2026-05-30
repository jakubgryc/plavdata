import { Badge, Button, Group, Modal, Stack, Table, Text } from "@mantine/core";
import type { Group as GroupType } from "../../schema/groups";
import type { Swimmer, SwimmerEdits } from "../../schema/swimmers";

interface EditedSwimmerData {
  edits: SwimmerEdits;
  original: Swimmer;
}

interface ConfirmChangesModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  editedSwimmers: Map<number, EditedSwimmerData>;
  groups: GroupType[];
  loading: boolean;
}

export function ConfirmChangesModal({
  opened,
  onClose,
  onConfirm,
  editedSwimmers,
  groups,
  loading,
}: ConfirmChangesModalProps) {
  const getGroupName = (groupId: number | null | undefined): string => {
    if (groupId === null || groupId === undefined) return "Bez skupiny";
    const group = groups.find((g) => g.id === groupId);
    return group?.display_name_cs ?? "Neznámá";
  };

  const formatBoolean = (value: boolean): string => {
    return value ? "Ano" : "Ne";
  };

  // Build list of changes with swimmer info
  const changesList = Array.from(editedSwimmers?.entries() ?? [])
    .map(([_swimmerId, { edits, original }]) => {
      const fieldChanges: { field: string; from: string; to: string }[] = [];

      if (edits.group_id !== undefined && edits.group_id !== original.group_id) {
        fieldChanges.push({
          field: "Skupina",
          from: getGroupName(original.group_id),
          to: getGroupName(edits.group_id),
        });
      }

      if (
        edits.show_in_comparison !== undefined &&
        edits.show_in_comparison !== original.show_in_comparison
      ) {
        fieldChanges.push({
          field: "Porovnání",
          from: formatBoolean(original.show_in_comparison),
          to: formatBoolean(edits.show_in_comparison),
        });
      }

      if (
        edits.show_in_personal_bests !== undefined &&
        edits.show_in_personal_bests !== original.show_in_personal_bests
      ) {
        fieldChanges.push({
          field: "Osobní rekordy",
          from: formatBoolean(original.show_in_personal_bests),
          to: formatBoolean(edits.show_in_personal_bests),
        });
      }

      if (
        edits.show_in_relay_builder !== undefined &&
        edits.show_in_relay_builder !== original.show_in_relay_builder
      ) {
        fieldChanges.push({
          field: "Štafety",
          from: formatBoolean(original.show_in_relay_builder),
          to: formatBoolean(edits.show_in_relay_builder),
        });
      }

      if (fieldChanges.length === 0) return null;

      return {
        original,
        fieldChanges,
      };
    })
    .filter(Boolean);

  return (
    <Modal opened={opened} onClose={onClose} title="Potvrdit změny" size="lg" centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Chystáte se uložit následující změny u {changesList.length} plavců:
        </Text>

        <Table withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Plavec</Table.Th>
              <Table.Th>Pole</Table.Th>
              <Table.Th>Z</Table.Th>
              <Table.Th>Na</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {changesList.map((change) => {
              if (!change) return null;
              return change.fieldChanges.map((fc, idx) => (
                <Table.Tr key={`${change.original.id}-${fc.field}`}>
                  {idx === 0 && (
                    <Table.Td rowSpan={change.fieldChanges.length} fw={500}>
                      {change.original.surname} {change.original.name}
                    </Table.Td>
                  )}
                  <Table.Td>
                    <Badge variant="light" size="sm">
                      {fc.field}
                    </Badge>
                  </Table.Td>
                  <Table.Td c="red">{fc.from}</Table.Td>
                  <Table.Td c="green">{fc.to}</Table.Td>
                </Table.Tr>
              ));
            })}
          </Table.Tbody>
        </Table>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Zrušit
          </Button>
          <Button onClick={onConfirm} loading={loading}>
            Uložit změny
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
