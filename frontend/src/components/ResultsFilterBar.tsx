import { Box, Chip, Flex, Paper, SegmentedControl, Select, SimpleGrid, Text } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import dayjs from "dayjs";
import { useMemo } from "react";
import { AGE_CATEGORY_LABELS } from "../utils/constants";

interface FilterBarProps {
  filters: {
    pool: string;
    discipline: string;
    gender: string;
    ageCategory: string;
    dateFrom: string;
    dateTo: string;
    timeType: string;
    viewMode: string;
  };
  onFilterChange: (updates: Record<string, string>) => void;
}

const DATE_PRESETS = [
  {
    label: "Tato sezóna",
    value: [
      dayjs().month() >= 8
        ? dayjs().month(8).startOf("month").format("YYYY-MM-DD")
        : dayjs().subtract(1, "year").month(8).startOf("month").format("YYYY-MM-DD"),
      dayjs().format("YYYY-MM-DD"),
    ] as [string, string],
  },
  {
    label: "Minulá sezóna",
    value: [
      dayjs().month() >= 8
        ? dayjs().subtract(1, "year").month(8).startOf("month").format("YYYY-MM-DD")
        : dayjs().subtract(2, "year").month(8).startOf("month").format("YYYY-MM-DD"),
      dayjs().month() >= 8
        ? dayjs().month(7).endOf("month").format("YYYY-MM-DD")
        : dayjs().subtract(1, "year").month(7).endOf("month").format("YYYY-MM-DD"),
    ] as [string, string],
  },
  {
    label: "Tento rok",
    value: [
      dayjs().startOf("year").format("YYYY-MM-DD"),
      dayjs().endOf("year").format("YYYY-MM-DD"),
    ] as [string, string],
  },
  {
    label: "Minulý rok",
    value: [
      dayjs().subtract(1, "year").startOf("year").format("YYYY-MM-DD"),
      dayjs().subtract(1, "year").endOf("year").format("YYYY-MM-DD"),
    ] as [string, string],
  },
];

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

function ResultsFilterBar({ filters, onFilterChange }: FilterBarProps) {
  const currentStrokeGroup = useMemo(() => {
    const matched = STROKE_MAP.find((group) => group.distances.includes(filters.discipline));
    return matched ? matched.value : "VZ";
  }, [filters.discipline]);

  const availableDistances = useMemo(() => {
    const matched = STROKE_MAP.find((group) => group.value === currentStrokeGroup);
    let distances = matched ? matched.distances : [];
    if (filters.pool === "50") {
      distances = distances.filter((d) => d !== "100 O");
    }
    return distances;
  }, [currentStrokeGroup, filters.pool]);

  const handleStrokeGroupChange = (newStroke: string) => {
    const targetGroup = STROKE_MAP.find((group) => group.value === newStroke);
    if (targetGroup && targetGroup.distances.length > 0) {
      let defaultDistance = targetGroup.distances[0];
      if (filters.pool === "50" && defaultDistance === "100 O") {
        defaultDistance = targetGroup.distances[1];
      }
      onFilterChange({ discipline: defaultDistance });
    }
  };
  const dateRangeValue: [string | null, string | null] = [
    filters.dateFrom || null,
    filters.dateTo || null,
  ];

  const handleDateRangeChange = (value: [string | null, string | null]) => {
    onFilterChange({
      dateFrom: value[0] ?? "",
      dateTo: value[1] ?? "",
    });
  };
  return (
    <Paper p="sm" shadow="sm" radius="md" withBorder mb="md">
      <Flex direction="column" gap="sm">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 6 }} spacing="sm">
          <Box>
            <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
              Bazén
            </Text>
            <SegmentedControl
              size="xs"
              value={filters.pool}
              onChange={(val) => onFilterChange({ pool: val })}
              data={[
                { label: "Vše", value: "all" },
                { label: "25m", value: "25" },
                { label: "50m", value: "50" },
              ]}
              w="100%"
            />
          </Box>

          <Box>
            <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
              Pohlaví
            </Text>
            <SegmentedControl
              size="xs"
              value={filters.gender}
              onChange={(val) => onFilterChange({ gender: val })}
              data={[
                { label: "Muži", value: "male" },
                { label: "Ženy", value: "female" },
              ]}
              w="100%"
            />
          </Box>

          <Box>
            <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
              Věk / Kategorie
            </Text>
            <Select
              size="xs"
              value={filters.ageCategory}
              onChange={(val) => onFilterChange({ ageCategory: val ?? "" })}
              data={Object.entries(AGE_CATEGORY_LABELS).map(([key, label]) => ({
                value: key,
                label,
              }))}
              placeholder="Všechny"
              w="100%"
            />
          </Box>

          <Box>
            <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
              Časové období
            </Text>
            <DatePickerInput
              size="xs"
              type="range"
              presets={DATE_PRESETS}
              placeholder="Vyber datumy"
              value={dateRangeValue}
              onChange={handleDateRangeChange}
              clearable
              w="100%"
            />
          </Box>

          <Box>
            <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
              Mezičasy
            </Text>
            <SegmentedControl
              size="xs"
              value={filters.timeType}
              onChange={(val) => onFilterChange({ timeType: val })}
              data={[
                { label: "Všechny", value: "all" },
                { label: "Cílové", value: "onlyFinal" },
              ]}
              w="100%"
            />
          </Box>

          <Box>
            <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
              Rozsah výsledků
            </Text>
            <SegmentedControl
              size="xs"
              value={filters.viewMode}
              onChange={(val) => onFilterChange({ viewMode: val })}
              data={[
                { label: "Vše", value: "all" },
                { label: "Pouze nejlepší", value: "best" },
              ]}
              w="100%"
            />
          </Box>
        </SimpleGrid>
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
                value={filters.discipline}
                onChange={(val) => val && onFilterChange({ discipline: val as string })}
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
  );
}

export default ResultsFilterBar;
