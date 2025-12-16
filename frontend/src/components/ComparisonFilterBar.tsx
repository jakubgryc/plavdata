import {
  MultiSelect,
  SegmentedControl,
  Select,
  Flex,
  SimpleGrid,
  Paper,
} from "@mantine/core";
import { Button } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { DISCIPLINES } from "../utils/constants";
import type { GroupedSwimmers } from "../schema/types";

interface ComparisonFilterBarProps {
  groupedSwimmers: GroupedSwimmers[];
  selectedSwimmers: string[];
  setSelectedSwimmers: (value: string[]) => void;
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
  const isOutdated =
    lastFetchedFilterHash !== "" && lastFetchedFilterHash !== filterHash;
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <Paper p="md" shadow="md" radius="md" withBorder>
      <Flex
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        gap="md"
        p="sm"
      >
        <MultiSelect
          label="Plavci"
          placeholder="Vyber až 8 plavců"
          searchable
          clearable
          maxValues={8}
          value={selectedSwimmers}
          onChange={setSelectedSwimmers}
          data={groupedSwimmers.map(({ group, swimmers }) => ({
            group: group === "veteran" ? "bývalí" : group,
            items: swimmers.map(
              (swimmer) => `${swimmer.surname} ${swimmer.name}`,
            ),
          }))}
          w={{ base: "100%", md: "50%" }}
        />
        <Select
          value={selectedDiscipline}
          onChange={setSelectedDiscipline}
          label="Disciplína"
          data={DISCIPLINES}
          placeholder="Vyber disciplínu"
          comboboxProps={{ width: 150, position: "bottom-start" }}
          w={{ base: "100%", md: "33%" }}
        />
      </Flex>
      <Flex
        direction={{ base: "column", lg: "row" }}
        justify="space-between"
        align={{ base: "stretch", lg: "center" }}
        gap="md"
        p="sm"
      >
        <SimpleGrid
          cols={{ base: 2, md: 4 }}
          spacing="xs"
          verticalSpacing="sm"
          w={{ base: "100%", lg: "80%" }}
        >
          <div>
            <p className="text-sm pl-1 pb-1 font-semibold">Bazén</p>
            <SegmentedControl
              value={pool}
              onChange={setPool}
              defaultValue={"25"}
              data={[
                { label: "25m", value: "25" },
                { label: "50m", value: "50" },
              ]}
              w="90%"
            />
          </div>
          <div>
            <p className="text-sm pl-1 pb-1 font-semibold">Časová osa</p>
            <SegmentedControl
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
              w="90%"
            />
          </div>
          <div>
            <p className="text-sm pl-1 pb-1 font-semibold">Mezičasy</p>
            <SegmentedControl
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
              w="90%"
            />
          </div>
          <div>
            <p className="text-sm pl-1 pb-1 font-semibold">Zobrazení časů</p>
            <SegmentedControl
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
              w="90%"
            />
          </div>
        </SimpleGrid>
        <Button
          disabled={!isOutdated && lastFetchedFilterHash !== ""}
          variant={isOutdated ? "filled" : "light"}
          color={isOutdated ? "orange" : "blue"}
          radius="md"
          size="sm"
          onClick={onFetchResults}
          w={{ base: "100%", md: "auto" }}
          mt={{ base: 0, md: "lg" }}
          pr="md"
        >
          {lastFetchedFilterHash !== ""
            ? isOutdated
              ? "Aktualizovat data"
              : "Aktualizovat data"
            : "Načíst výsledky"}
        </Button>
      </Flex>
    </Paper>
  );
}

export default ComparisonFilterBar;
