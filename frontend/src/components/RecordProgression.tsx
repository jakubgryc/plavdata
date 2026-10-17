import {
  Box,
  Center,
  Chip,
  Flex,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Table,
  Text,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { IconChartLine } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { TooltipContentProps } from "recharts";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { API_BASE_URL } from "../../config";
import { POOLS } from "../utils/constants";
import { formatDate, parseTimeFromMillis } from "../utils/timeUtils";
import TableSplitRelayLegend from "./shared/TableSplitRelayLegend";

interface ProgressionStep {
  resultId: number;
  swimmerId: number;
  name: string;
  surname: string;
  time: number;
  previousTime: number | null;
  ageAtResult: number | null;
  splitTime?: boolean;
  relayPart?: boolean;
  competitionLocation?: string;
  date: string;
}

type ChartStep = {
  dateLabel: string;
  timeLabel: string;
  timeMs: number;
  name: string;
  surname: string;
  location?: string;
  ageAtResult: number | null;
  previousTime: number | null;
};

const STROKE_MAP = [
  { label: "Motýlek", value: "M", distances: ["50 M", "100 M", "200 M"] },
  { label: "Znak", value: "Z", distances: ["50 Z", "100 Z", "200 Z"] },
  { label: "Prsa", value: "P", distances: ["50 P", "100 P", "200 P"] },
  {
    label: "Kraul",
    value: "VZ",
    distances: ["50 VZ", "100 VZ", "200 VZ", "400 VZ", "800 VZ", "1500 VZ"],
  },
  { label: "Polohový závod", value: "O", distances: ["100 O", "200 O", "400 O"] },
];

const CATEGORY_OPTIONS = [
  ...["9", "10", "11", "12", "13", "14"].map((value) => ({ value, label: `${value}letí` })),
  { value: "junior", label: "Dorost" },
  { value: "open", label: "Absolutní" },
];

function formatImprovement(previousTime: number | null, time: number): string | null {
  if (previousTime == null) return null;
  return `${((previousTime - time) / 1000).toFixed(2)} s`;
}

function ProgressionTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  const { colorScheme } = useMantineColorScheme();
  if (!active || !payload?.length) return null;
  const step = payload[0]?.payload as ChartStep | undefined;
  if (!step) return null;
  const improvement = formatImprovement(step.previousTime, step.timeMs);

  return (
    <Paper
      p="sm"
      radius="md"
      withBorder
      shadow="md"
      style={{
        backgroundColor: colorScheme === "dark" ? "#1a1b1e" : "#ffffff",
        borderColor: colorScheme === "dark" ? "#373A40" : "#dee2e6",
      }}
    >
      <Text size="sm" fw={700}>
        {step.surname} {step.name}
      </Text>
      <Text size="xs" c="dimmed">
        {step.dateLabel}
      </Text>
      <Text size="sm" fw={600} c="#0ea5e9">
        {step.timeLabel}
      </Text>
      {step.location && (
        <Text size="xs" c="dimmed">
          Místo: {step.location}
        </Text>
      )}
      {step.ageAtResult != null && (
        <Text size="xs" c="dimmed">
          Věk: {step.ageAtResult}
        </Text>
      )}
      {improvement && (
        <Text size="xs" c="green">
          Zlepšení: {improvement}
        </Text>
      )}
    </Paper>
  );
}

function RecordProgression() {
  const { colorScheme } = useMantineColorScheme();
  const [course, setCourse] = useState<string>("25");
  const [discipline, setDiscipline] = useState<string>("50 VZ");
  const [sex, setSex] = useState<string>("male");
  const [ageCategory, setAgeCategory] = useState<string>("open");
  const [steps, setSteps] = useState<ProgressionStep[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const currentStrokeGroup = useMemo(() => {
    const matched = STROKE_MAP.find((group) => group.distances.includes(discipline));
    return matched ? matched.value : "VZ";
  }, [discipline]);

  const availableDistances = useMemo(() => {
    const matched = STROKE_MAP.find((group) => group.value === currentStrokeGroup);
    let distances = matched ? matched.distances : [];
    if (course === "50") {
      distances = distances.filter((d) => d !== "100 O");
    }
    return distances;
  }, [currentStrokeGroup, course]);

  // 100 O does not exist on 50m — switch to the next medley distance when the pool changes
  useEffect(() => {
    if (course === "50" && discipline === "100 O") {
      setDiscipline("200 O");
    }
  }, [course, discipline]);

  const handleStrokeGroupChange = (newStroke: string) => {
    const targetGroup = STROKE_MAP.find((group) => group.value === newStroke);
    if (targetGroup && targetGroup.distances.length > 0) {
      let defaultDistance = targetGroup.distances[0];
      if (course === "50" && defaultDistance === "100 O") {
        defaultDistance = targetGroup.distances[1];
      }
      setDiscipline(defaultDistance);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchProgression = async () => {
      setIsFetching(true);
      try {
        const params = new URLSearchParams({
          discipline_code: discipline,
          course,
          sex,
          age_category: ageCategory,
        });
        const response = await fetch(`${API_BASE_URL}/results/record-progression?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          console.error("Failed to fetch record progression:", response.status);
          setSteps([]);
          return;
        }
        setSteps((await response.json()) as ProgressionStep[]);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Error fetching record progression:", error);
        setSteps([]);
      } finally {
        setIsFetching(false);
      }
    };

    void fetchProgression();
    return () => controller.abort();
  }, [discipline, course, sex, ageCategory]);

  const chartData: ChartStep[] = useMemo(
    () =>
      steps.map((step) => ({
        dateLabel: formatDate(step.date),
        timeLabel: parseTimeFromMillis(step.time),
        timeMs: step.time,
        name: step.name,
        surname: step.surname,
        location: step.competitionLocation,
        ageAtResult: step.ageAtResult,
        previousTime: step.previousTime,
      })),
    [steps],
  );

  const hasSplitOrRelay = steps.some((step) => step.splitTime || step.relayPart);

  const getRowBackground = (step: ProgressionStep) => {
    if (step.splitTime) return colorScheme === "dark" ? "#4A5D4A" : "#D4EDDA";
    if (step.relayPart) return colorScheme === "dark" ? "#5A4A7A" : "#E2E3F1";
    return undefined;
  };

  return (
    <Flex direction="column" gap="md">
      <Paper p="sm" shadow="sm" radius="md" withBorder>
        <Flex direction="column" gap="sm">
          <Flex gap="lg" wrap="wrap" align="flex-start">
            <Box>
              <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
                Bazén{" "}
              </Text>
              <SegmentedControl size="xs" value={course} onChange={setCourse} data={POOLS} />
            </Box>
            <Box>
              <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
                Pohlaví
              </Text>
              <SegmentedControl
                size="xs"
                value={sex}
                onChange={setSex}
                data={[
                  { label: "Muži", value: "male" },
                  { label: "Ženy", value: "female" },
                ]}
              />
            </Box>
            <Box style={{ flex: 1, minWidth: 280 }}>
              <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
                Kategorie
              </Text>
              <Chip.Group
                value={ageCategory}
                onChange={(val) => val && setAgeCategory(val as string)}
              >
                <Flex gap="xs" wrap="wrap">
                  {CATEGORY_OPTIONS.map((option) => (
                    <Chip key={option.value} value={option.value} size="xs" variant="filled">
                      {option.label}
                    </Chip>
                  ))}
                </Flex>
              </Chip.Group>
            </Box>
          </Flex>

          <Box>
            <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
              Disciplína
            </Text>
            <Paper withBorder p={6} radius="md">
              <Flex gap="md" align="center" direction={{ base: "column", sm: "row" }}>
                <SegmentedControl
                  size="xs"
                  value={currentStrokeGroup}
                  onChange={handleStrokeGroupChange}
                  data={STROKE_MAP.map((g) => ({ label: g.label, value: g.value }))}
                  style={{ flexShrink: 0 }}
                />

                <Box
                  visibleFrom="sm"
                  style={{
                    width: "1px",
                    height: "20px",
                    backgroundColor: "var(--mantine-color-default-border)",
                  }}
                />

                <Chip.Group
                  value={discipline}
                  onChange={(val) => val && setDiscipline(val as string)}
                >
                  <Flex gap="xs" wrap="wrap" justify={{ base: "center", sm: "flex-start" }}>
                    {availableDistances.map((dist) => (
                      <Chip key={dist} value={dist} size="xs" variant="filled">
                        {dist}
                      </Chip>
                    ))}
                  </Flex>
                </Chip.Group>
              </Flex>
            </Paper>
          </Box>
        </Flex>
      </Paper>

      {hasSplitOrRelay && <TableSplitRelayLegend />}

      <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
        <Group gap="xs" mb="md">
          <ThemeIcon variant="transparent" color="blue">
            <IconChartLine />
          </ThemeIcon>
          <Title order={4}>
            Vývoj rekordu: {discipline}, {course} m
          </Title>
        </Group>

        {isFetching ? (
          <Center h={250}>
            <Loader />
          </Center>
        ) : chartData.length === 0 ? (
          <Center h={250}>
            <Text c="dimmed">Pro tuto kombinaci nebyl nalezen žádný rekord.</Text>
          </Center>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 8 }}>
              <XAxis
                dataKey="dateLabel"
                tick={{
                  fill: colorScheme === "dark" ? "#909296" : "#868e96",
                  fontSize: 12,
                }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(value: number) => parseTimeFromMillis(value)}
                domain={[(dataMin: number) => dataMin - 500, (dataMax: number) => dataMax + 500]}
                width={70}
                tick={{
                  fill: colorScheme === "dark" ? "#909296" : "#868e96",
                  fontSize: 12,
                }}
              />
              <Tooltip content={<ProgressionTooltip />} />
              <Line
                type="stepAfter"
                dataKey="timeMs"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ r: 3, fill: "#0ea5e9" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
        <Table.ScrollContainer minWidth={700}>
          <Table striped highlightOnHover className="responsive-results-table">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Datum</Table.Th>
                <Table.Th>Plavec</Table.Th>
                <Table.Th>Čas</Table.Th>
                <Table.Th>Věk</Table.Th>
                <Table.Th>Místo</Table.Th>
                <Table.Th>Zlepšení</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {steps.map((step, index) => {
                const improvement = formatImprovement(step.previousTime, step.time);
                return (
                  <Table.Tr key={step.resultId}>
                    <Table.Td c="dimmed">{index + 1}</Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {formatDate(step.date)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        className="textHoverLink"
                        component={Link}
                        to={`/swimmer/${step.swimmerId}`}
                        fw={500}
                        size="sm"
                      >
                        {step.surname} {step.name}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ backgroundColor: getRowBackground(step) }}>
                      <Text fw={700} size="sm" c="#0ea5e9">
                        {parseTimeFromMillis(step.time)}
                      </Text>
                    </Table.Td>
                    <Table.Td>{step.ageAtResult ?? "-"}</Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" truncate>
                        {step.competitionLocation || "-"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {improvement ? (
                        <Text size="sm" c="green" fw={500}>
                          {improvement}
                        </Text>
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </Flex>
  );
}

export default RecordProgression;
