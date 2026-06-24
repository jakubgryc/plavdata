import { Box, Button, Chip, Flex, MultiSelect, Paper, SegmentedControl, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useMemo } from "react";
import type { GroupedSwimmers } from "../schema/types";
import { swimmersFilter } from "../utils/filterUtils";

interface ComparisonFilterBarProps {
  groupedSwimmers: GroupedSwimmers[];
  selectedSwimmers: number[];
  setSelectedSwimmers: (value: number[]) => void;
  selectedDiscipline: string | null;
  setSelectedDiscipline: (value: string | null) => void;
  pool: string;
  setPool: (value: string) => void;
  timeAxis: string;
  setTimeAxis: (value: string) => void;
  intermediateTimes: string;
  setIntermediateTimes: (value: string) => void;
  resultType: string;
  setResultType: (value: string) => void;
  onFetchResults: () => void;
  lastFetchedFilterHash: string;
}

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

function ComparisonFilterBar({
  groupedSwimmers,
  selectedSwimmers,
  setSelectedSwimmers,
  selectedDiscipline,
  setSelectedDiscipline,
  pool,
  setPool,
  timeAxis,
  setTimeAxis,
  intermediateTimes,
  setIntermediateTimes,
  resultType,
  setResultType,
  onFetchResults,
  lastFetchedFilterHash,
}: ComparisonFilterBarProps) {
  const filterHash = `${selectedSwimmers.join(",")}|${selectedDiscipline}|${pool}`;
  const isOutdated = lastFetchedFilterHash !== "" && lastFetchedFilterHash !== filterHash;
  const isMobile = useMediaQuery("(max-width: 768px)");

  const currentStrokeGroup = useMemo(() => {
    const matched = STROKE_MAP.find((group) => group.distances.includes(selectedDiscipline ?? ""));
    return matched ? matched.value : "VZ";
  }, [selectedDiscipline]);

  const availableDistances = useMemo(() => {
    const matched = STROKE_MAP.find((group) => group.value === currentStrokeGroup);
    return matched ? matched.distances : [];
  }, [currentStrokeGroup]);

  const handleStrokeGroupChange = (newStroke: string) => {
    const targetGroup = STROKE_MAP.find((group) => group.value === newStroke);
    if (targetGroup && targetGroup.distances.length > 0) {
      setSelectedDiscipline(targetGroup.distances[0]);
    }
  };

  return (
    <Paper p="sm" shadow="sm" radius="md" withBorder mb="md">
      <Flex direction="column" gap="sm">
        <Flex
          direction={{ base: "column", lg: "row" }}
          gap="sm"
          align={{ base: "stretch", lg: "flex-end" }}
        >
          <Flex direction="column" w={{ base: "100%", lg: "32%" }}>
            <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
              Plavci
            </Text>
            <MultiSelect
              placeholder="Vyber až 8 plavců"
              searchable
              clearable
              filter={swimmersFilter}
              maxValues={8}
              size="xs"
              value={selectedSwimmers.map(String)}
              onChange={(values) => setSelectedSwimmers(values.map(Number))}
              data={groupedSwimmers.map(({ group, swimmers }) => ({
                group: group === "veteran" ? "bývalí" : group,
                items: swimmers.map((swimmer) => ({
                  value: swimmer.id.toString(),
                  label: `${swimmer.surname} ${swimmer.name}`,
                })),
              }))}
              w="100%"
            />
          </Flex>

          <Flex gap="sm" w={{ base: "100%", lg: "68%" }} wrap={{ base: "wrap", lg: "nowrap" }}>
            <Flex direction="column" flex={1}>
              <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
                Bazén
              </Text>
              <SegmentedControl
                size="xs"
                value={pool}
                onChange={setPool}
                defaultValue={"25"}
                data={[
                  { label: "25m", value: "25" },
                  { label: "50m", value: "50" },
                ]}
                w="100%"
              />
            </Flex>
            <Flex direction="column" flex={1}>
              <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
                Časová osa
              </Text>
              <SegmentedControl
                size="xs"
                value={timeAxis}
                onChange={setTimeAxis}
                data={
                  isMobile
                    ? [
                        { label: "Abs.", value: "absolute" },
                        { label: "Věk.", value: "relative" },
                      ]
                    : [
                        { label: "Absolutní", value: "absolute" },
                        { label: "Věková", value: "relative" },
                      ]
                }
                w="100%"
              />
            </Flex>
            <Flex direction="column" flex={1}>
              <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
                Mezičasy
              </Text>
              <SegmentedControl
                size="xs"
                value={intermediateTimes}
                onChange={setIntermediateTimes}
                data={
                  isMobile
                    ? [
                        { label: "Vše", value: "all" },
                        { label: "Cílové", value: "onlyFinal" },
                      ]
                    : [
                        { label: "Vše", value: "all" },
                        { label: "Pouze cílové", value: "onlyFinal" },
                      ]
                }
                w="100%"
              />
            </Flex>
            <Flex direction="column" flex={1}>
              <Text size="xs" pl="xs" pb={4} fw={600} c="dimmed" tt="uppercase">
                Zobrazení časů
              </Text>
              <SegmentedControl
                size="xs"
                value={resultType}
                onChange={setResultType}
                data={
                  isMobile
                    ? [
                        { label: "Vše", value: "all" },
                        { label: "Zlepšení", value: "onlyImprovements" },
                      ]
                    : [
                        { label: "Vše", value: "all" },
                        { label: "Pouze zlepšení", value: "onlyImprovements" },
                      ]
                }
                w="100%"
              />
            </Flex>
          </Flex>
        </Flex>
        <Flex
          direction={{ base: "column", lg: "row" }}
          gap="sm"
          align={{ base: "stretch", lg: "center" }}
        >
          <Flex direction="column" flex={1}>
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
                <Chip.Group
                  value={selectedDiscipline ?? ""}
                  onChange={(val) => val && setSelectedDiscipline(val as string)}
                >
                  <Box
                    visibleFrom="sm"
                    style={{
                      width: "1px",
                      height: "20px",
                      backgroundColor: "var(--mantine-color-default-border)",
                    }}
                  />
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
          </Flex>

          <Flex direction="column" justify="flex-end" h="100%">
            <Text
              size="xs"
              pl="xs"
              pb={4}
              fw={600}
              c="dimmed"
              tt="uppercase"
              style={{ visibility: "hidden" }}
            >
              {/* This is a placeholder to align the button with the discipline label */}.
            </Text>
            <Button
              disabled={!isOutdated && lastFetchedFilterHash !== ""}
              variant={isOutdated ? "filled" : "light"}
              color={isOutdated ? "orange" : "blue"}
              radius="md"
              size="sm"
              onClick={onFetchResults}
              w={{ base: "100%", lg: "auto" }}
              h={42}
            >
              {lastFetchedFilterHash !== "" ? "Aktualizovat data" : "Načíst výsledky"}
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Paper>
  );
}

export default ComparisonFilterBar;
