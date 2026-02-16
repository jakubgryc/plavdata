import {
  Modal,
  TextInput,
  Button,
  Stack,
  Group as MantineGroup,
  Text,
  Badge,
  Divider,
  Table,
  ScrollArea,
  Loader,
  Center,
  ActionIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { IconTrash } from "@tabler/icons-react";
import type {
  GroupDetail,
  UpdateGroupRequest,
  SwimmerInGroup,
} from "../../schema/groups";
import { groupsApi } from "../../utils/groupsApi";

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
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [swimmers, setSwimmers] = useState<SwimmerInGroup[]>([]);
  const [loadingSwimmers, setLoadingSwimmers] = useState(false);

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

  const handleRemoveSwimmer = async (
    swimmerId: number,
    swimmerName: string,
  ) => {
    if (!group) return;

    if (
      !window.confirm(
        `Opravdu chcete odebrat plavce "${swimmerName}" ze skupiny? Tímto se také skryjí jeho/její rekordy a štafety.`,
      )
    ) {
      return;
    }

    try {
      await groupsApi.removeSwimmerGroup(group.id, swimmerId);
      // Refresh swimmers list
      const data = await groupsApi.getSwimmers(group.id);
      setSwimmers(data);
    } catch (error) {
      console.error("Failed to remove swimmer:", error);
      alert(
        error instanceof Error ? error.message : "Nepodařilo se odebrat plavce",
      );
    }
  };

  // Fetch swimmers when modal opens or group changes
  useEffect(() => {
    const fetchSwimmers = async () => {
      if (!group || !opened) return;

      setLoadingSwimmers(true);
      try {
        const data = await groupsApi.getSwimmers(group.id);
        setSwimmers(data);
      } catch (error) {
        console.error("Failed to load swimmers:", error);
      } finally {
        setLoadingSwimmers(false);
      }
    };

    fetchSwimmers();
  }, [group?.id, opened]);

  // Reset form when group changes
  useEffect(() => {
    if (group) {
      form.setValues({
        name: group.name,
        display_name_cs: group.display_name_cs,
      });
    }
  }, [group?.id]);

  if (!group) return null;

  return (
    <Modal
      opened={opened}
      onClose={() => {
        setIsEditing(false);
        onClose();
      }}
      title="Detail skupiny"
      size="lg"
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

          <div>
            <Text size="sm" c="dimmed" mb="xs">
              Plavci ve skupině
            </Text>
            {loadingSwimmers ? (
              <Center p="xl">
                <Loader size="sm" />
              </Center>
            ) : swimmers.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                Ve skupině nejsou žádní plavci
              </Text>
            ) : (
              <ScrollArea h={300} type="auto">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Jméno</Table.Th>
                      <Table.Th>Ročník</Table.Th>
                      <Table.Th>Pohlaví</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {swimmers.map((swimmer) => {
                      const isActive =
                        !swimmer.membership_end ||
                        new Date(swimmer.membership_end) >= new Date();
                      const fullName = `${swimmer.surname} ${swimmer.name}`;

                      return (
                        <Table.Tr
                          key={swimmer.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            navigate(`/swimmer/${swimmer.id}`);
                            onClose();
                          }}
                        >
                          <Table.Td>{fullName}</Table.Td>
                          <Table.Td>{swimmer.birth_year}</Table.Td>
                          <Table.Td>
                            {swimmer.sex === "male" ? "M" : "Ž"}
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              size="sm"
                              color={isActive ? "green" : "gray"}
                              variant="light"
                            >
                              {isActive ? "Aktivní" : "Neaktivní"}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSwimmer(swimmer.id, fullName);
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </div>

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
