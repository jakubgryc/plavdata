import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Title,
  Table,
  Text,
  Group,
  Pagination,
  Loader,
  Center,
  Stack,
  Button,
  Paper,
  Box,
  Badge,
  Flex,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { authApi } from "../../utils/auth";
import { swimmersApi } from "../../utils/swimmersApi";
import { SwimmerRow } from "../../components/admin/SwimmerRow";
import { ConfirmChangesModal } from "../../components/admin/ConfirmChangesModal";
import type { Swimmer, SwimmerEdits } from "../../schema/swimmers";
import type { Group as GroupType } from "../../schema/groups";

const PAGE_SIZE = 50;

// Store original swimmer data for edit comparison across pages
interface EditedSwimmerData {
  edits: SwimmerEdits;
  original: Swimmer;
}

export function AdminSwimmersPage() {
  const navigate = useNavigate();

  // Data state
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edits tracking - Map of swimmerId -> edits with original data
  const [editedSwimmers, setEditedSwimmers] = useState<
    Map<number, EditedSwimmerData>
  >(new Map());

  // Confirmation modal
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);

  // Check auth on mount and prevent fetching if not authenticated
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      navigate("/admin");
      return;
    }

    // Load groups once if authenticated
    const loadGroups = async () => {
      try {
        const data = await swimmersApi.getGroups();
        setGroups(data);
      } catch (error) {
        console.error("Failed to load groups:", error);
        notifications.show({
          title: "Chyba",
          message: "Nepodařilo se načíst skupiny",
          color: "red",
        });
      }
    };
    loadGroups();
  }, [navigate]);

  // Load swimmers when page changes, only if authenticated
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      return;
    }

    const loadSwimmers = async () => {
      try {
        setLoading(true);
        const data = await swimmersApi.getAll({ page, pageSize: PAGE_SIZE });
        setSwimmers(data.swimmers);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      } catch (error) {
        console.error("Failed to load swimmers:", error);
        notifications.show({
          title: "Chyba",
          message: "Nepodařilo se načíst plavce",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    };
    loadSwimmers();
  }, [page, navigate]);

  // Compute select options once per groups load/change (avoid per-row map work)
  const groupOptions = useMemo(
    () => [
      { value: "", label: "Bez skupiny" },
      ...groups.map((g) => ({
        value: g.id.toString(),
        label: g.display_name_cs,
      })),
    ],
    [groups],
  );

  // Handle edit for a swimmer field
  const handleEdit = useCallback(
    (swimmerId: number, field: keyof SwimmerEdits, value: unknown) => {
      setEditedSwimmers((prev) => {
        const newEditedSwimmers = new Map(prev);
        const existing = newEditedSwimmers.get(swimmerId);

        // Get original swimmer data - either from existing edit or current page
        let original: Swimmer | undefined = existing?.original;
        if (!original) {
          original = swimmers.find((s) => s.id === swimmerId);
        }
        if (!original) return prev;

        const currentEdits = existing?.edits || {};
        const originalValue = original[field];

        // If new value equals original, remove this field from edits
        if (value === originalValue) {
          const { [field]: _, ...rest } = currentEdits;
          if (Object.keys(rest).length === 0) {
            newEditedSwimmers.delete(swimmerId);
          } else {
            newEditedSwimmers.set(swimmerId, { edits: rest, original });
          }
        } else {
          newEditedSwimmers.set(swimmerId, {
            edits: { ...currentEdits, [field]: value },
            original,
          });
        }

        return newEditedSwimmers;
      });
    },
    [swimmers],
  );

  // Count of pending changes (field-level count)
  const pendingChangesCount = useMemo(() => {
    let count = 0;
    editedSwimmers.forEach(({ edits, original }) => {
      if (edits.group_id !== undefined && edits.group_id !== original.group_id)
        count++;
      if (
        edits.show_in_comparison !== undefined &&
        edits.show_in_comparison !== original.show_in_comparison
      )
        count++;
      if (
        edits.show_in_personal_bests !== undefined &&
        edits.show_in_personal_bests !== original.show_in_personal_bests
      )
        count++;
      if (
        edits.show_in_relay_builder !== undefined &&
        edits.show_in_relay_builder !== original.show_in_relay_builder
      )
        count++;
    });
    return count;
  }, [editedSwimmers]);

  // Get only real changes (filter out reverted edits)
  const getRealChanges = useCallback((): Map<number, SwimmerEdits> => {
    const realChanges = new Map<number, SwimmerEdits>();

    editedSwimmers.forEach(({ edits, original }, swimmerId) => {
      const actualChanges: SwimmerEdits = {};

      if (
        edits.group_id !== undefined &&
        edits.group_id !== original.group_id
      ) {
        actualChanges.group_id = edits.group_id;
      }
      if (
        edits.show_in_comparison !== undefined &&
        edits.show_in_comparison !== original.show_in_comparison
      ) {
        actualChanges.show_in_comparison = edits.show_in_comparison;
      }
      if (
        edits.show_in_personal_bests !== undefined &&
        edits.show_in_personal_bests !== original.show_in_personal_bests
      ) {
        actualChanges.show_in_personal_bests = edits.show_in_personal_bests;
      }
      if (
        edits.show_in_relay_builder !== undefined &&
        edits.show_in_relay_builder !== original.show_in_relay_builder
      ) {
        actualChanges.show_in_relay_builder = edits.show_in_relay_builder;
      }

      if (Object.keys(actualChanges).length > 0) {
        realChanges.set(swimmerId, actualChanges);
      }
    });

    return realChanges;
  }, [editedSwimmers]);

  // Save all changes
  const handleSaveChanges = useCallback(async () => {
    const realChanges = getRealChanges();

    if (realChanges.size === 0) {
      closeConfirm();
      return;
    }

    setSaving(true);

    try {
      // Build bulk update request
      const updates = Array.from(realChanges.entries()).map(
        ([swimmerId, changes]) => ({
          swimmer_id: swimmerId,
          updates: changes,
        }),
      );

      const result = await swimmersApi.bulkUpdate({ updates });

      // Update local state with all updated swimmers
      if (result.updated_swimmers.length > 0) {
        setSwimmers((prev) =>
          prev.map((s) => {
            const updated = result.updated_swimmers.find((u) => u.id === s.id);
            return updated || s;
          }),
        );
      }

      // Clear all edits after successful save
      setEditedSwimmers(new Map());
      closeConfirm();

      if (result.error_count === 0) {
        notifications.show({
          title: "Uloženo",
          message: `Úspěšně uloženo ${result.success_count} změn`,
          color: "green",
        });
      } else {
        notifications.show({
          title: "Částečně uloženo",
          message: `Uloženo ${result.success_count} změn, ${result.error_count} selhalo`,
          color: "orange",
        });
      }
    } catch (error) {
      console.error("Failed to save changes:", error);
      notifications.show({
        title: "Chyba",
        message: "Nepodařilo se uložit změny",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  }, [getRealChanges, closeConfirm]);

  // Discard all changes
  const handleDiscardChanges = useCallback(() => {
    setEditedSwimmers(new Map());
  }, []);

  // Handle page change - keep edits across pages
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const hasChanges = editedSwimmers.size > 0;

  return (
    <Flex direction="column" h="100%" w="100%" py="md" pb="xl">
      <Stack
        gap="md"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap="md">
          <Title order={2}>Správa plavců</Title>

          <Group gap="sm">
            {hasChanges && (
              <>
                <Badge color="yellow" size="lg" variant="light">
                  {pendingChangesCount} změn
                </Badge>
                <Button
                  variant="subtle"
                  color="gray"
                  leftSection={<IconX size={16} />}
                  onClick={handleDiscardChanges}
                >
                  Zahodit
                </Button>
                <Button
                  leftSection={<IconDeviceFloppy size={16} />}
                  onClick={openConfirm}
                >
                  Uložit změny
                </Button>
              </>
            )}
          </Group>
        </Flex>

        <Text c="dimmed" size="sm">
          Celkem {total} plavců • Stránka {page} z {totalPages}
        </Text>

        <Paper
          shadow="sm"
          radius="md"
          withBorder
          style={{
            overflow: "hidden",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Box
            pos="relative"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {loading && (
              <Center
                pos="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                style={{ zIndex: 10 }}
              >
                <Loader />
              </Center>
            )}

            <Table.ScrollContainer
              minWidth={500}
              className="responsive-table admin-table-scroll"
              style={{ flex: 1, minHeight: 0 }}
            >
              <Table
                striped
                highlightOnHover
                stickyHeader
                withColumnBorders
                stickyHeaderOffset={0}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ minWidth: 120 }}>Příjmení</Table.Th>
                    <Table.Th style={{ minWidth: 100 }}>Jméno</Table.Th>
                    <Table.Th style={{ minWidth: 60 }} ta="center">
                      Rok
                    </Table.Th>
                    <Table.Th style={{ minWidth: 120 }}>Skupina</Table.Th>
                    <Table.Th style={{ minWidth: 90 }} ta="center">
                      Porovnání
                    </Table.Th>
                    <Table.Th style={{ minWidth: 90 }} ta="center">
                      Os. rekordy
                    </Table.Th>
                    <Table.Th style={{ minWidth: 90 }} ta="center">
                      Štafety
                    </Table.Th>
                    <Table.Th style={{ minWidth: 80 }} ta="center">
                      Stav
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {swimmers.map((swimmer) => (
                    <SwimmerRow
                      key={swimmer.id}
                      swimmer={swimmer}
                      groupOptions={groupOptions}
                      edits={editedSwimmers.get(swimmer.id)?.edits}
                      onEdit={handleEdit}
                    />
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Box>
        </Paper>

        <Flex justify="center" mt="md">
          <Pagination
            value={page}
            onChange={handlePageChange}
            total={totalPages}
            siblings={1}
            boundaries={1}
          />
        </Flex>
      </Stack>

      {editedSwimmers.size > 0 && (
        <ConfirmChangesModal
          opened={confirmOpened}
          onClose={closeConfirm}
          onConfirm={handleSaveChanges}
          editedSwimmers={editedSwimmers}
          groups={groups}
          loading={saving}
        />
      )}
    </Flex>
  );
}
