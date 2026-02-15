import {
  Modal,
  TextInput,
  Button,
  Stack,
  Group as MantineGroup,
  Text,
  Badge,
  Divider,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import type { GroupDetail, UpdateGroupRequest } from "../../schema/groups";

interface GroupDetailModalProps {
  group: GroupDetail | null;
  opened: boolean;
  onClose: () => void;
  onUpdate: (groupId: number, data: UpdateGroupRequest) => Promise<void>;
  onDelete: (groupId: number) => Promise<void>;
}

export function GroupDetailModal({
  group,
  opened,
  onClose,
  onUpdate,
  onDelete,
}: GroupDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<UpdateGroupRequest>({
    initialValues: {
      name: group?.name || "",
      display_name_cs: group?.display_name_cs || "",
    },
    validate: {
      name: (value: string | undefined) =>
        value && value.trim().length === 0 ? "Klíč skupiny je povinný" : null,
      display_name_cs: (value: string | undefined) =>
        value && value.trim().length === 0
          ? "Zobrazovaný název je povinný"
          : null,
    },
  });

  const handleSubmit = async (values: UpdateGroupRequest) => {
    if (!group) return;

    try {
      await onUpdate(group.id, values);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update group:", error);
    }
  };

  const handleDelete = async () => {
    if (!group) return;

    if (
      !window.confirm(
        `Opravdu chcete smazat skupinu "${group.display_name_cs}"? Tuto akci nelze vrátit zpět.`,
      )
    ) {
      return;
    }

    try {
      await onDelete(group.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete group:", error);
      alert(
        error instanceof Error ? error.message : "Nepodařilo se smazat skupinu",
      );
    }
  };

  if (!group) return null;

  // Reset form when group changes
  if (group.name !== form.values.name) {
    form.setValues({
      name: group.name,
      display_name_cs: group.display_name_cs,
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={() => {
        setIsEditing(false);
        onClose();
      }}
      title="Detail skupiny"
      size="md"
    >
      {isEditing ? (
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Klíč skupiny"
              placeholder="Např. U13"
              required
              {...form.getInputProps("name")}
            />
            <TextInput
              label="Zobrazovaný název (Česky)"
              placeholder="Např. Mladší žáci"
              required
              {...form.getInputProps("display_name_cs")}
            />
            <MantineGroup justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => {
                  setIsEditing(false);
                  form.setValues({
                    name: group.name,
                    display_name_cs: group.display_name_cs,
                  });
                }}
              >
                Zrušit
              </Button>
              <Button type="submit">Uložit</Button>
            </MantineGroup>
          </Stack>
        </form>
      ) : (
        <Stack>
          <div>
            <Text size="sm" c="dimmed">
              Zobrazovaný název
            </Text>
            <Text size="lg" fw={500}>
              {group.display_name_cs}
            </Text>
          </div>

          <div>
            <Text size="sm" c="dimmed">
              Klíč skupiny
            </Text>
            <Text>{group.name}</Text>
          </div>

          <Divider />

          <MantineGroup>
            <div>
              <Text size="sm" c="dimmed">
                Celkem plavců
              </Text>
              <Badge size="lg" variant="light" color="blue">
                {group.swimmer_count}
              </Badge>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                Aktivní plavci
              </Text>
              <Badge size="lg" variant="light" color="green">
                {group.active_swimmer_count}
              </Badge>
            </div>
          </MantineGroup>

          <Divider />

          <MantineGroup justify="space-between">
            <Button
              variant="subtle"
              color="red"
              onClick={handleDelete}
              disabled={group.swimmer_count > 0}
            >
              Smazat skupinu
            </Button>
            <Button onClick={() => setIsEditing(true)}>Upravit</Button>
          </MantineGroup>
        </Stack>
      )}
    </Modal>
  );
}
