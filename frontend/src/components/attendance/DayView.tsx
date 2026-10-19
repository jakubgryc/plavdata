import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Group,
  Loader,
  NumberInput,
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
import { IconDeviceFloppy } from "@tabler/icons-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../../../config";
import type { DayOut, SaveDayBody } from "../../schema/attendance";
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
  });
  const loadedDraftRef = useRef<DraftState | null>(null);

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

  const scheduleLabel = dayData.schedule
    ? `${dayData.schedule.start_time} – ${dayData.schedule.end_time}`
    : null;

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

      <Box style={{ overflowX: "auto" }} mb="md">
        <Table
          striped
          stripedColor={colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[1]}
          highlightOnHover
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Plavec</Table.Th>
              <Table.Th style={{ textAlign: "center", width: 80 }}>Přítomen</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedSwimmers.map((swimmer) => (
              <Table.Tr key={swimmer.id}>
                <Table.Td>
                  {swimmer.surname} {swimmer.name}
                </Table.Td>
                <Table.Td style={{ textAlign: "center" }}>
                  <Flex justify="center">
                    <Switch
                      size="sm"
                      checked={draft.attendance[swimmer.id] ?? false}
                      onChange={() => togglePresent(swimmer.id)}
                      aria-label={`${swimmer.surname} ${swimmer.name}`}
                      styles={{
                        track: {
                          backgroundColor:
                            (draft.attendance[swimmer.id] ?? false)
                              ? undefined
                              : colorScheme === "dark"
                                ? theme.colors.dark[3]
                                : theme.colors.gray[4],
                        },
                      }}
                    />
                  </Flex>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>

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
          />
        </Group>
        <Textarea
          label="Popis tréninku"
          autosize
          minRows={3}
          maxRows={12}
          value={draft.description}
          onChange={(e) => {
            const value = e.currentTarget.value;
            setDraft((prev) => ({ ...prev, description: value }));
          }}
        />
      </Stack>

      <Button
        fullWidth
        leftSection={saving ? <Loader size="xs" /> : <IconDeviceFloppy size={16} />}
        disabled={!isDirty || saving}
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
