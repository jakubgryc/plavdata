import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Loader,
  Stack,
  Switch,
  Table,
  Text,
  Tooltip,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconDeviceFloppy } from "@tabler/icons-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../../../config";
import type { DayOut, SaveDayBody, WeekDayOut, WeekOut } from "../../schema/attendance";
import { toApiDate } from "../../utils/attendance";
import { authenticatedFetch } from "../../utils/authenticatedFetch";

dayjs.extend(utc);

interface WeekViewProps {
  groupId: number;
  weekStart: Date;
}

type DraftState = Record<string, Record<number, boolean>>;

function buildDraft(days: WeekDayOut[]): DraftState {
  const draft: DraftState = {};
  for (const day of days) {
    const dayDraft: Record<number, boolean> = {};
    for (const entry of day.attendance) {
      dayDraft[entry.swimmer_id] = entry.present;
    }
    draft[day.date] = dayDraft;
  }
  return draft;
}

function isDayModified(
  date: string,
  draft: DraftState,
  loaded: DraftState,
  swimmerIds: number[],
): boolean {
  const draftDay = draft[date];
  const loadedDay = loaded[date];
  for (const swimmerId of swimmerIds) {
    const draftVal = draftDay?.[swimmerId] ?? false;
    const loadedVal = loadedDay?.[swimmerId] ?? false;
    if (draftVal !== loadedVal) return true;
  }
  return false;
}

function WeekView({ groupId, weekStart }: WeekViewProps) {
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const [weekData, setWeekData] = useState<WeekOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftState>({});
  const loadedDraftRef = useRef<DraftState | null>(null);

  const fetchWeek = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const weekStartStr = toApiDate(weekStart);
      const response = await authenticatedFetch(
        `${API_BASE_URL}/attendance/week?group_id=${groupId}&week_start=${weekStartStr}`,
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
        setWeekData(null);
        return;
      }
      const data = (await response.json()) as WeekOut;
      setWeekData(data);
      const newDraft = buildDraft(data.days);
      setDraft(newDraft);
      loadedDraftRef.current = newDraft;
    } catch {
      setError("Nepodařilo se načíst data.");
      setWeekData(null);
    } finally {
      setLoading(false);
    }
  }, [groupId, weekStart]);

  useEffect(() => {
    fetchWeek();
  }, [fetchWeek]);

  const isDirty = useMemo(() => {
    if (!loadedDraftRef.current || !weekData) return false;
    const swimmerIds = weekData.swimmers.map((s) => s.id);
    for (const day of weekData.days) {
      if (isDayModified(day.date, draft, loadedDraftRef.current, swimmerIds)) {
        return true;
      }
    }
    return false;
  }, [draft, weekData]);

  const includedDays = useMemo(() => {
    if (!weekData) return [];
    return weekData.days.filter((d) => d.is_training_day || d.filled);
  }, [weekData]);

  const sortedSwimmers = useMemo(() => {
    if (!weekData) return [];
    return [...weekData.swimmers].sort((a, b) => {
      const cmp = a.surname.localeCompare(b.surname, "cs");
      if (cmp !== 0) return cmp;
      return a.name.localeCompare(b.name, "cs");
    });
  }, [weekData]);

  const togglePresent = (date: string, swimmerId: number) => {
    setDraft((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [swimmerId]: !prev[date][swimmerId],
      },
    }));
  };

  const handleSave = async () => {
    if (!weekData || !loadedDraftRef.current) return;

    setSaving(true);
    const failures: { date: string; detail: string }[] = [];
    const swimmerIds = weekData.swimmers.map((s) => s.id);

    try {
      for (const day of weekData.days) {
        // Skip days that haven't changed
        if (!isDayModified(day.date, draft, loadedDraftRef.current, swimmerIds)) {
          continue;
        }

        // Fetch full day data to get training metrics/description
        let fullDay: DayOut | null = null;
        try {
          const dayResponse = await authenticatedFetch(
            `${API_BASE_URL}/attendance/day?group_id=${groupId}&date=${day.date}`,
          );
          if (dayResponse.ok) {
            fullDay = (await dayResponse.json()) as DayOut;
          }
        } catch {
          /* Fetch failed */
        }

        if (!fullDay) {
          failures.push({ date: day.date, detail: "Nepodařilo se načíst data dne." });
          continue;
        }

        // Build attendance array for all swimmers
        const draftDay = draft[day.date];
        const attendance = weekData.swimmers.map((swimmer) => ({
          swimmer_id: swimmer.id,
          present: draftDay?.[swimmer.id] ?? false,
        }));

        const body: SaveDayBody = {
          group_id: groupId,
          date: day.date,
          attendance,
          total_meters: fullDay.training?.total_meters ?? null,
          drill_meters: fullDay.training?.drill_meters ?? null,
          kick_meters: fullDay.training?.kick_meters ?? null,
          description: fullDay.training?.description ?? null,
        };

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
          failures.push({ date: day.date, detail });
        }
      }

      // Refetch week data
      await fetchWeek();

      if (failures.length === 0) {
        notifications.show({ color: "green", message: "Týden uložen" });
      } else {
        const failedDates = failures.map((f) => dayjs(f.date).format("D.M.")).join(", ");
        const firstDetail = failures[0].detail;
        notifications.show({
          color: "orange",
          message: `Chyba u ${failedDates}: ${firstDetail}`,
        });
      }
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

  if (!weekData) {
    return null;
  }

  if (includedDays.length === 0) {
    return (
      <Card withBorder p="lg" radius="md">
        <Text c="dimmed">Tento týden nemá žádné tréninky.</Text>
      </Card>
    );
  }

  return (
    <Card withBorder p="lg" radius="md">
      <Box style={{ overflowX: "auto" }} mb="md">
        <Table
          striped
          stripedColor={colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[1]}
          highlightOnHover
          withColumnBorders
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th
                style={{
                  position: "sticky",
                  left: 0,
                  backgroundColor: "var(--mantine-color-body)",
                  zIndex: 1,
                  textAlign: "left",
                }}
              >
                Plavec
              </Table.Th>
              {includedDays.map((day) => {
                const date = dayjs(day.date);
                const weekday = date.locale("cs").format("ddd");
                const dateStr = date.format("D.M.");
                const timeRange = day.schedule
                  ? `${day.schedule.start_time}–${day.schedule.end_time}`
                  : null;

                const headerContent = (
                  <Stack gap={2} align="center">
                    <Text size="sm" fw={500}>
                      {weekday} {dateStr}
                    </Text>
                    {timeRange && (
                      <Text size="xs" c="dimmed">
                        {timeRange}
                      </Text>
                    )}
                    {day.filled ? (
                      <Badge color="green" size="xs">
                        zapsáno
                      </Badge>
                    ) : (
                      <Badge color="gray" size="xs">
                        nevyplněno
                      </Badge>
                    )}
                  </Stack>
                );

                return (
                  <Table.Th key={day.date} style={{ textAlign: "center", minWidth: 120 }}>
                    {day.filled && day.saved_by_name ? (
                      <Tooltip label={`Uložil: ${day.saved_by_name}`}>{headerContent}</Tooltip>
                    ) : (
                      headerContent
                    )}
                  </Table.Th>
                );
              })}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedSwimmers.map((swimmer) => (
              <Table.Tr key={swimmer.id}>
                <Table.Td
                  style={{
                    position: "sticky",
                    left: 0,
                    backgroundColor: "var(--mantine-color-body)",
                    zIndex: 1,
                    textAlign: "left",
                  }}
                >
                  {swimmer.surname} {swimmer.name}
                </Table.Td>
                {includedDays.map((day) => (
                  <Table.Td key={day.date} style={{ textAlign: "center" }}>
                    <Flex justify="center">
                      <Switch
                        size="sm"
                        checked={draft[day.date]?.[swimmer.id] ?? false}
                        onChange={() => togglePresent(day.date, swimmer.id)}
                        aria-label={`${swimmer.surname} ${swimmer.name} - ${day.date}`}
                        styles={{
                          track: {
                            backgroundColor:
                              (draft[day.date]?.[swimmer.id] ?? false)
                                ? undefined
                                : colorScheme === "dark"
                                  ? theme.colors.dark[3]
                                  : theme.colors.gray[4],
                          },
                        }}
                      />
                    </Flex>
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>

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
        Uložit týden
      </Button>
    </Card>
  );
}

export default WeekView;
