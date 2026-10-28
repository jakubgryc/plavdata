import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Flex,
  Group,
  Loader,
  NumberInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  Title,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconChevronDown, IconChevronUp, IconDeviceFloppy } from "@tabler/icons-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../../../config";
import type { DayOut, ImportSource, SaveDayBody } from "../../schema/attendance";
import { fmtDayLabel, toApiDate } from "../../utils/attendance";
import { authenticatedFetch } from "../../utils/authenticatedFetch";

dayjs.extend(utc);

interface DayViewProps {
  groupId: number;
  date: Date;
}

interface DraftState {
  attendance: Record<number, boolean>;
  totalMeters: string;
  drillMeters: string;
  kickMeters: string;
  description: string;
  durationMinutes: string;
}

function computeScheduleMinutes(slot: { start_time: string; end_time: string } | null): number | null {
  if (!slot) return null;
  const [sh, sm] = slot.start_time.split(":").map(Number);
  const [eh, em] = slot.end_time.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const diff = endMin >= startMin ? endMin - startMin : 24 * 60 - startMin + endMin;
  return diff > 0 ? diff : null;
}

function buildDraft(day: DayOut): DraftState {
  const attendance: Record<number, boolean> = {};
  for (const swimmer of day.swimmers) {
    const entry = day.training?.attendance.find((a) => a.swimmer_id === swimmer.id);
    attendance[swimmer.id] = entry?.present ?? false;
  }
  return {
    attendance,
    totalMeters: day.training?.total_meters != null ? String(day.training.total_meters) : "",
    drillMeters: day.training?.drill_meters != null ? String(day.training.drill_meters) : "",
    kickMeters: day.training?.kick_meters != null ? String(day.training.kick_meters) : "",
    description: day.training?.description ?? "",
    durationMinutes:
      day.training?.duration_minutes != null ? String(day.training.duration_minutes) : "",
  };
}

function draftToBody(groupId: number, date: Date, draft: DraftState): SaveDayBody {
  const attendance = Object.entries(draft.attendance).map(([swimmerId, present]) => ({
    swimmer_id: Number(swimmerId),
    present,
  }));
  return {
    group_id: groupId,
    date: toApiDate(date),
    attendance,
    total_meters: draft.totalMeters !== "" ? Number(draft.totalMeters) : null,
    drill_meters: draft.drillMeters !== "" ? Number(draft.drillMeters) : null,
    kick_meters: draft.kickMeters !== "" ? Number(draft.kickMeters) : null,
    description: draft.description !== "" ? draft.description : null,
    duration_minutes: draft.durationMinutes !== "" ? Number(draft.durationMinutes) : null,
  };
}

function draftsEqual(a: DraftState, b: DraftState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function DayView({ groupId, date }: DayViewProps) {
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const [dayData, setDayData] = useState<DayOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftState>({
    attendance: {},
    totalMeters: "",
    drillMeters: "",
    kickMeters: "",
    description: "",
    durationMinutes: "",
  });
  const loadedDraftRef = useRef<DraftState | null>(null);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [importSources, setImportSources] = useState<ImportSource[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const fetchDay = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = toApiDate(date);
      const response = await authenticatedFetch(
        `${API_BASE_URL}/attendance/day?group_id=${groupId}&date=${dateStr}`,
      );
      if (!response.ok) {
        let detail = "Nepodařilo se načíst data.";
        try {
          const body = await response.json();
          if (body.detail) detail = body.detail;
        } catch {
          /* JSON parse failed */
        }
        setError(detail);
        setDayData(null);
        return;
      }
      const data = (await response.json()) as DayOut;
      setDayData(data);
      const newDraft = buildDraft(data);
      setDraft(newDraft);
      loadedDraftRef.current = newDraft;
    } catch {
      setError("Nepodařilo se načíst data.");
      setDayData(null);
    } finally {
      setLoading(false);
    }
  }, [groupId, date]);

  useEffect(() => {
    fetchDay();
  }, [fetchDay]);

  // Fetch import sources when the collapse opens, or date/group changes
  useEffect(() => {
    if (!advancedOpen) return;
    let cancelled = false;
    const dateStr = toApiDate(date);
    authenticatedFetch(
      `${API_BASE_URL}/attendance/import-sources?date=${dateStr}&exclude_group_id=${groupId}`,
    )
      .then((resp) => {
        if (cancelled) return undefined;
        if (!resp.ok) {
          setImportSources([]);
          setImportError(true);
          setSelectedSource(null);
          return undefined;
        }
        return (resp.json() as Promise<ImportSource[]>).then((data) => {
          if (cancelled) return;
          setImportSources(data ?? []);
          setImportError(false);
          setSelectedSource(null);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setImportSources([]);
          setImportError(true);
          setSelectedSource(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [advancedOpen, groupId, date]);

  const isDirty = useMemo(() => {
    if (!loadedDraftRef.current) return false;
    return !draftsEqual(draft, loadedDraftRef.current);
  }, [draft]);

  const sortedSwimmers = useMemo(() => {
    if (!dayData) return [];
    return [...dayData.swimmers].sort((a, b) => {
      const cmp = a.surname.localeCompare(b.surname, "cs");
      if (cmp !== 0) return cmp;
      return a.name.localeCompare(b.name, "cs");
    });
  }, [dayData]);

  const togglePresent = (swimmerId: number) => {
    setDraft((prev) => ({
      ...prev,
      attendance: {
        ...prev.attendance,
        [swimmerId]: !prev.attendance[swimmerId],
      },
    }));
  };

  const handleImport = async (sourceGroupId: string) => {
    setSelectedSource(sourceGroupId);
    setImportLoading(true);
    try {
      const dateStr = toApiDate(date);
      const response = await authenticatedFetch(
        `${API_BASE_URL}/attendance/day?group_id=${sourceGroupId}&date=${dateStr}`,
      );
      if (!response.ok) {
        notifications.show({
          color: "red",
          message: "Nepodařilo se načíst trénink ze zvolené skupiny.",
        });
        return;
      }
      const sourceDay = (await response.json()) as DayOut;
      if (!sourceDay.training) {
        notifications.show({
          color: "red",
          message: "Zvolená skupina nemá tento den uložený trénink.",
        });
        return;
      }
      const t = sourceDay.training;
      setDraft((prev) => ({
        ...prev,
        totalMeters: t.total_meters != null ? String(t.total_meters) : "",
        drillMeters: t.drill_meters != null ? String(t.drill_meters) : "",
        kickMeters: t.kick_meters != null ? String(t.kick_meters) : "",
        description: t.description ?? "",
      }));
      const sourceName =
        importSources.find((s) => s.group_id === Number(sourceGroupId))?.display_name_cs ?? "";
      notifications.show({
        color: "blue",
        message: `Hodnoty načteny ze skupiny ${sourceName}.`,
      });
    } catch {
      notifications.show({
        color: "red",
        message: "Nepodařilo se načíst trénink ze zvolené skupiny.",
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = draftToBody(groupId, date, draft);
      const response = await authenticatedFetch(`${API_BASE_URL}/attendance/day`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        let detail = "Uložení se nezdařilo.";
        try {
          const respBody = await response.json();
          if (respBody.detail) detail = respBody.detail;
        } catch {
          /* JSON parse failed */
        }
        notifications.show({ color: "red", message: detail });
        return;
      }
      const data = (await response.json()) as DayOut;
      setDayData(data);
      const newDraft = buildDraft(data);
      setDraft(newDraft);
      loadedDraftRef.current = newDraft;
      notifications.show({ color: "green", message: "Uloženo" });
    } catch {
      notifications.show({ color: "red", message: "Uložení se nezdařilo." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card withBorder p="lg" radius="md">
        <Loader />
      </Card>
    );
  }

  if (error) {
    return (
      <Alert color="red" title="Chyba">
        {error}
      </Alert>
    );
  }

  if (!dayData) {
    return null;
  }

  const readOnly = !dayData.is_training_day && !dayData.training;

  const scheduleLabel = dayData.schedule
    ? `${dayData.schedule.start_time} – ${dayData.schedule.end_time}`
    : null;

  const scheduleMinutes = computeScheduleMinutes(dayData.schedule);

  let badge: React.ReactNode = null;
  if (!dayData.is_training_day && dayData.training) {
    badge = <Badge color="orange">Mimo rozvrh</Badge>;
  } else if (!dayData.is_training_day && !dayData.training) {
    badge = <Badge color="gray">Volno</Badge>;
  }

  const savedLine = dayData.training ? (
    <Text size="sm" c="dimmed">
      Uložil: {dayData.training.saved_by_name},{" "}
      {dayjs.utc(dayData.training.saved_at).local().format("D. M. YYYY H:mm")}
    </Text>
  ) : null;

  const importSourceOptions = importSources.map((s) => ({
    value: String(s.group_id),
    label: s.display_name_cs,
  }));

  return (
    <Card withBorder p="lg" radius="md">
      <Group justify="space-between" mb="md" wrap="wrap">
        <Stack gap={4}>
          <Title order={4}>{fmtDayLabel(date)}</Title>
          {scheduleLabel && (
            <Text size="sm" c="dimmed">
              {scheduleLabel}
            </Text>
          )}
          {savedLine}
        </Stack>
        {badge}
      </Group>

      <Box
        style={{
          overflowX: "auto",
          border: "1px solid var(--mantine-color-default-border)",
          borderRadius: theme.radius.md,
          // slightly lifted surface so the table doesn't blend into the card
          backgroundColor: colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0],
        }}
        mb="md"
      >
        <Table
          className="attendance-day-table"
          striped
          stripedColor={colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[2]}
          highlightOnHover
          withRowBorders
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 56 }} aria-hidden />
              <Table.Th>Plavec</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedSwimmers.map((swimmer) => {
              const present = draft.attendance[swimmer.id] ?? false;
              return (
                <Table.Tr
                  key={swimmer.id}
                  onClick={() => togglePresent(swimmer.id)}
                  style={{
                    cursor: "pointer",
                    backgroundColor: present
                      ? colorScheme === "dark"
                        ? "rgba(18, 160, 216, 0.14)"
                        : "rgba(18, 160, 216, 0.10)"
                      : undefined,
                  }}
                >
                  {/* stopPropagation: tapping the switch itself must not toggle twice */}
                  <Table.Td
                    style={{ textAlign: "center", width: 56 }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Flex justify="center">
                      <Switch
                        size="sm"
                        checked={present}
                        onChange={() => togglePresent(swimmer.id)}
                        aria-label={`${swimmer.surname} ${swimmer.name}`}
                        styles={{
                          track: {
                            backgroundColor: present
                              ? undefined
                              : colorScheme === "dark"
                                ? theme.colors.dark[3]
                                : theme.colors.gray[4],
                          },
                        }}
                      />
                    </Flex>
                  </Table.Td>
                  <Table.Td fw={500}>
                    {swimmer.surname} {swimmer.name}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>

      {readOnly && (
        <Text size="sm" c="dimmed" mb="sm">
          Tento den nemá skupina trénink.
        </Text>
      )}

      <Stack gap="sm" mb="md">
        <Group grow>
          <NumberInput
            label="Celkem metrů"
            min={0}
            value={draft.totalMeters}
            onChange={(val) =>
              setDraft((prev) => ({
                ...prev,
                totalMeters: val === "" ? "" : String(val),
              }))
            }
            hideControls
            disabled={readOnly}
          />
          <NumberInput
            label="Technika (m)"
            min={0}
            value={draft.drillMeters}
            onChange={(val) =>
              setDraft((prev) => ({
                ...prev,
                drillMeters: val === "" ? "" : String(val),
              }))
            }
            hideControls
            disabled={readOnly}
          />
          <NumberInput
            label="Nohy (m)"
            min={0}
            value={draft.kickMeters}
            onChange={(val) =>
              setDraft((prev) => ({
                ...prev,
                kickMeters: val === "" ? "" : String(val),
              }))
            }
            hideControls
            disabled={readOnly}
          />
        </Group>
        <Textarea
          label="Popis tréninku"
          autosize
          minRows={3}
          maxRows={12}
          value={draft.description}
          onFocus={(event) => {
            // attempt to fix iOS Safari scrolling
            const el = event.currentTarget;
            window.setTimeout(
              () => el.scrollIntoView({ block: "center", behavior: "smooth" }),
              300,
            );
          }}
          onChange={(e) => {
            const value = e.currentTarget.value;
            setDraft((prev) => ({ ...prev, description: value }));
          }}
          disabled={readOnly}
        />
      </Stack>

      <Box mb="md">
        <Button
          variant="subtle"
          size="xs"
          onClick={() => setAdvancedOpen((prev) => !prev)}
          rightSection={advancedOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          disabled={readOnly}
          compact
        >
          Další možnosti
        </Button>
        <Collapse in={advancedOpen}>
          <Group grow align="flex-start" wrap="nowrap" gap="sm" mt="sm">
            <Stack gap={4}>
              <NumberInput
                label="Délka tréninku (min)"
                min={1}
                max={600}
                hideControls
                value={draft.durationMinutes}
                onChange={(val) =>
                  setDraft((prev) => ({
                    ...prev,
                    durationMinutes: val === "" ? "" : String(val),
                  }))
                }
                disabled={readOnly}
              />
              {scheduleMinutes != null && (
                <Text size="xs" c="dimmed">
                  Výchozí z rozvrhu: {scheduleMinutes} min.
                </Text>
              )}
            </Stack>
            <Stack gap={4}>
              {importLoading && <Loader size="xs" />}
              {!importLoading && importError && (
                <Text size="xs" c="red">
                  Nepodařilo se načíst skupiny k importu.
                </Text>
              )}
              {!importLoading && importSources.length > 0 && (
                <Select
                  label="Importovat trénink"
                  placeholder="Vyber skupinu"
                  data={importSourceOptions}
                  value={selectedSource}
                  onChange={(val) => {
                    if (val) {
                      handleImport(val);
                    }
                  }}
                  disabled={readOnly}
                />
              )}
            </Stack>
          </Group>
        </Collapse>
      </Box>

      <Button
        fullWidth
        leftSection={saving ? <Loader size="xs" /> : <IconDeviceFloppy size={16} />}
        disabled={!isDirty || saving || readOnly}
        onClick={handleSave}
        styles={{
          root: {
            "&[data-disabled]": {
              backgroundColor: colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3],
              color: colorScheme === "dark" ? theme.colors.dark[0] : theme.colors.gray[7],
              borderColor: "transparent",
            },
          },
        }}
      >
        Uložit docházku
      </Button>
    </Card>
  );
}

export default DayView;
