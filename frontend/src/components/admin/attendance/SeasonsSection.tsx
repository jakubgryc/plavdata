import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../config";
import type { Season } from "../../../schema/attendanceAdmin";
import { apiDelete, apiGet, apiPost, apiPut } from "../../../utils/apiHelpers";
import { authenticatedFetch } from "../../../utils/authenticatedFetch";

function SeasonsSection() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/edit modal
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Season | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Copy modal
  const [copyTarget, setCopyTarget] = useState<Season | null>(null);
  const [copySourceId, setCopySourceId] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      startDate: null as Date | null,
      endDate: null as Date | null,
    },
    validate: {
      name: (v: string) => (v.trim().length === 0 ? "Název je povinný" : null),
      startDate: (v: Date | null) => (v === null ? "Začátek je povinný" : null),
      endDate: (v: Date | null) => (v === null ? "Konec je povinný" : null),
    },
  });

  const fetchSeasons = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<Season[]>(`${API_BASE_URL}/admin/seasons`);
      setSeasons(data);
    } catch {
      notifications.show({
        title: "Chyba",
        message: "Nepodařilo se načíst sezóny",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  const handleOpenCreate = () => {
    setEditingSeason(null);
    form.reset();
    setModalError(null);
    openModal();
  };

  const handleOpenEdit = (season: Season) => {
    setEditingSeason(season);
    form.setValues({
      name: season.name,
      startDate: dayjs(season.start_date).toDate(),
      endDate: dayjs(season.end_date).toDate(),
    });
    setModalError(null);
    openModal();
  };

  const handleSave = async (values: {
    name: string;
    startDate: Date | null;
    endDate: Date | null;
  }) => {
    if (!values.startDate || !values.endDate) return;
    setSaving(true);
    setModalError(null);
    try {
      const body = {
        name: values.name,
        start_date: dayjs(values.startDate).format("YYYY-MM-DD"),
        end_date: dayjs(values.endDate).format("YYYY-MM-DD"),
      };
      if (editingSeason) {
        await apiPut(`${API_BASE_URL}/admin/seasons/${editingSeason.id}`, body);
        notifications.show({
          title: "Uloženo",
          message: "Sezóna byla upravena.",
          color: "green",
        });
      } else {
        await apiPost(`${API_BASE_URL}/admin/seasons`, body);
        notifications.show({
          title: "Vytvořeno",
          message: "Sezóna byla vytvořena.",
          color: "green",
        });
      }
      closeModal();
      fetchSeasons();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Neznámá chyba");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`${API_BASE_URL}/admin/seasons/${deleteTarget.id}`);
      notifications.show({
        title: "Smazáno",
        message: `Sezóna „${deleteTarget.name}" byla smazána.`,
        color: "green",
      });
      setDeleteTarget(null);
      fetchSeasons();
    } catch (error) {
      notifications.show({
        title: "Chyba",
        message: error instanceof Error ? error.message : "Nepodařilo se smazat sezónu",
        color: "red",
      });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = async () => {
    if (!copyTarget || !copySourceId) return;
    setCopying(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/admin/seasons/${copyTarget.id}/copy-from/${copySourceId}`,
        { method: "POST" },
      );
      if (!response.ok) {
        let detail = "Kopírování selhalo";
        try {
          const body = await response.json();
          if (typeof body.detail === "string") detail = body.detail;
        } catch {
          /* empty */
        }
        throw new Error(detail);
      }
      notifications.show({
        title: "Zkopírováno",
        message: "Konfigurace zkopírována.",
        color: "green",
      });
      setCopyTarget(null);
      setCopySourceId(null);
      fetchSeasons();
    } catch (error) {
      notifications.show({
        title: "Chyba",
        message: error instanceof Error ? error.message : "Kopírování selhalo",
        color: "red",
      });
    } finally {
      setCopying(false);
    }
  };

  const otherSeasonOptions = seasons
    .filter((s) => s.id !== copyTarget?.id)
    .map((s) => ({ value: String(s.id), label: s.name }));

  return (
    <Stack gap="md">
      <Title order={4} c="dimmed" tt="uppercase" lts={1}>
        3. Sezóny
      </Title>

      <Card withBorder shadow="sm" radius="md" p="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>Sezóny</Title>
            <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate} size="sm">
              Nová sezóna
            </Button>
          </Group>

          {loading ? (
            <Loader size="sm" />
          ) : seasons.length === 0 ? (
            <Text size="sm" c="dimmed">
              Zatím nebyly vytvořeny žádné sezóny.
            </Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Název</Table.Th>
                  <Table.Th>Začátek</Table.Th>
                  <Table.Th>Konec</Table.Th>
                  <Table.Th w={160}>Akce</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {seasons.map((season) => (
                  <Table.Tr key={season.id}>
                    <Table.Td fw={500}>{season.name}</Table.Td>
                    <Table.Td>{dayjs(season.start_date).format("DD.MM.YYYY")}</Table.Td>
                    <Table.Td>{dayjs(season.end_date).format("DD.MM.YYYY")}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => handleOpenEdit(season)}
                          title="Upravit"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => setDeleteTarget(season)}
                          title="Smazat"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="grape"
                          onClick={() => {
                            setCopyTarget(season);
                            setCopySourceId(null);
                          }}
                          title="Kopírovat z…"
                        >
                          <IconCopy size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={editingSeason ? "Upravit sezónu" : "Nová sezóna"}
        centered
      >
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack>
            <TextInput
              label="Název"
              placeholder="Např. 2025/2026"
              required
              {...form.getInputProps("name")}
            />
            <DateInput
              label="Začátek"
              placeholder="Vyberte datum"
              valueFormat="DD.MM.YYYY"
              required
              {...form.getInputProps("startDate")}
            />
            <DateInput
              label="Konec"
              placeholder="Vyberte datum"
              valueFormat="DD.MM.YYYY"
              required
              {...form.getInputProps("endDate")}
            />
            {modalError && (
              <Alert color="red" variant="light">
                {modalError}
              </Alert>
            )}
            <Button type="submit" loading={saving} fullWidth>
              {editingSeason ? "Uložit" : "Vytvořit"}
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Smazat sezónu"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Opravdu smazat sezónu <strong>{deleteTarget?.name}</strong>?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Zrušit
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleting}>
              Smazat
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Copy Modal */}
      <Modal
        opened={copyTarget !== null}
        onClose={() => {
          setCopyTarget(null);
          setCopySourceId(null);
        }}
        title={`Kopírovat konfiguraci do „${copyTarget?.name}"`}
        centered
        size="sm"
      >
        <Stack>
          <Select
            label="Zkopírovat ze sezóny"
            placeholder="Vyberte zdrojovou sezónu"
            data={otherSeasonOptions}
            value={copySourceId}
            onChange={setCopySourceId}
          />
          <Button onClick={handleCopy} loading={copying} disabled={!copySourceId} fullWidth>
            Kopírovat
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

export default SeasonsSection;
