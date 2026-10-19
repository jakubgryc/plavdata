import {
  ActionIcon,
  Box,
  Center,
  Flex,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router";
import { API_BASE_URL } from "../../config";
import DayView from "../components/attendance/DayView";
import { useAuth } from "../hooks/useAuth";
import type { AttendanceContext, ContextGroup } from "../schema/attendance";
import { authenticatedFetch } from "../utils/authenticatedFetch";
import { defaultDate, isTrainingDay, toApiDate } from "../utils/attendance";

function AttendancePage() {
  const { isAuthenticated, role } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [view, setView] = useState<"day" | "week">("day");
  const [context, setContext] = useState<AttendanceContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const initializedRef = useRef(false);

  const fetchContext = useCallback(async (date: Date) => {
    setContextLoading(true);
    try {
      const dateStr = toApiDate(date);
      const response = await authenticatedFetch(
        `${API_BASE_URL}/attendance/context?date=${dateStr}`,
      );
      if (response.ok) {
        const data = (await response.json()) as AttendanceContext;
        setContext(data);
      } else {
        setContext(null);
      }
    } catch {
      setContext(null);
    } finally {
      setContextLoading(false);
    }
  }, []);

  // Fetch context whenever selectedDate changes
  useEffect(() => {
    fetchContext(selectedDate);
  }, [selectedDate, fetchContext]);

  // After context loads, handle group selection and initial default date
  useEffect(() => {
    if (!context || contextLoading) return;

    if (!context.season || context.groups.length === 0) return;

    // Keep selection if group still exists, else first
    const currentGroup = context.groups.find((g) => g.id === selectedGroupId);
    const targetGroup = currentGroup ?? context.groups[0];
    if (targetGroup.id !== selectedGroupId) {
      setSelectedGroupId(targetGroup.id);
    }

    // On first load, set date to defaultDate for the selected group
    if (!initializedRef.current) {
      initializedRef.current = true;
      const def = defaultDate(targetGroup.schedule, new Date());
      // Only update if different from current selectedDate
      if (toApiDate(def) !== toApiDate(selectedDate)) {
        setSelectedDate(def);
      }
    }
  }, [context, contextLoading, selectedGroupId, selectedDate]);

  const selectedGroup = useMemo((): ContextGroup | null => {
    if (!context) return null;
    return context.groups.find((g) => g.id === selectedGroupId) ?? null;
  }, [context, selectedGroupId]);

  const schedule = selectedGroup?.schedule ?? [];

  // Navigation: prev/next training day within ±90 days
  const prevDate = useMemo(() => {
    if (schedule.length === 0) return null;
    for (let i = 1; i <= 90; i++) {
      const candidate = dayjs(selectedDate).subtract(i, "day").toDate();
      if (isTrainingDay(schedule, candidate)) return candidate;
    }
    return null;
  }, [selectedDate, schedule]);

  const nextDate = useMemo(() => {
    if (schedule.length === 0) return null;
    for (let i = 1; i <= 90; i++) {
      const candidate = dayjs(selectedDate).add(i, "day").toDate();
      if (isTrainingDay(schedule, candidate)) return candidate;
    }
    return null;
  }, [selectedDate, schedule]);

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  // Season null empty state
  if (!contextLoading && context?.season === null) {
    return (
      <Center mih="60vh">
        <Stack align="center">
          <Title order={3}>Mimo sezónu</Title>
          <Text c="dimmed">Pro toto datum není zvolená sezóna.</Text>
        </Stack>
      </Center>
    );
  }

  // No groups empty state
  if (!contextLoading && context?.groups.length === 0) {
    const message =
      role === "admin"
        ? "Žádná skupina nemá rozvrh pro tuto sezónu."
        : "Nemáš přiřazenou žádnou skupinu.";
    return (
      <Center mih="60vh">
        <Stack align="center">
          <Title order={3}>Žádná skupina</Title>
          <Text c="dimmed">{message}</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Title order={2}>Docházka</Title>

      {/* Group selector */}
      {context && context.groups.length > 1 && (
        <SegmentedControl
          value={selectedGroupId != null ? String(selectedGroupId) : ""}
          onChange={(val) => setSelectedGroupId(Number(val))}
          data={context.groups.map((g) => ({
            value: String(g.id),
            label: g.display_name_cs,
          }))}
          fullWidth
        />
      )}

      {/* Date navigation row */}
      <Flex gap="sm" align="center" wrap="wrap">
        <ActionIcon
          variant="light"
          size="lg"
          disabled={!prevDate}
          onClick={() => {
            if (prevDate) setSelectedDate(prevDate);
          }}
          aria-label="Předchozí trénink"
        >
          <IconChevronLeft size={20} />
        </ActionIcon>

        <DatePickerInput
          value={selectedDate}
          onChange={(val) => {
            if (val) setSelectedDate(val);
          }}
          locale="cs"
          firstDayOfWeek={1}
          valueFormat="D. M. YYYY"
          maxDate={new Date()}
          style={{ flex: 1, minWidth: 140 }}
        />

        <ActionIcon
          variant="light"
          size="lg"
          disabled={!nextDate}
          onClick={() => {
            if (nextDate) setSelectedDate(nextDate);
          }}
          aria-label="Další trénink"
        >
          <IconChevronRight size={20} />
        </ActionIcon>

        <SegmentedControl
          value={view}
          onChange={(val) => setView(val as "day" | "week")}
          data={[
            { value: "day", label: "Den" },
            { value: "week", label: "Týden" },
          ]}
        />
      </Flex>

      {/* Content */}
      {selectedGroupId != null && (
        <>
          {view === "day" ? (
            <DayView groupId={selectedGroupId} date={selectedDate} />
          ) : (
            <Box p="lg">
              <Text c="dimmed">Týdenní pohled — připravuje se.</Text>
            </Box>
          )}
        </>
      )}
    </Stack>
  );
}

export default AttendancePage;
