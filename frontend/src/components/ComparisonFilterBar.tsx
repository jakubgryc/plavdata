import { MultiSelect, SegmentedControl, Select } from "@mantine/core";
import { Button } from "@mantine/core";
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
  // store the hash of the filters so i can warn the user if the data is outdated
  // based on this i will decide whether to show a warning icon next to the fetch results button
  // it should watch the selectedswimmers, selecteddiscipline and pool only
  const filterHash = `${selectedSwimmers.join(",")}|${selectedDiscipline}|${pool}`;
  const isOutdated =
    lastFetchedFilterHash !== "" && lastFetchedFilterHash !== filterHash;

  return (
    <div className="flex-col w-full justify-between  border px-8 border-gray-900 bg-white rounded-md shadow-lg">
      <div className="flex justify-between  py-1  border-0 border-black">
        <div className="w-1/2 ">
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
          />
        </div>
        <div className="w-1/3 ">
          <Select
            value={selectedDiscipline}
            onChange={setSelectedDiscipline}
            label="Disciplína"
            data={DISCIPLINES}
            placeholder="Vyber disciplínu"
            comboboxProps={{ width: 150, position: "bottom-start" }}
          />
        </div>
      </div>
      <div className="flex justify-between items-center w-full py-1 ">
        <div className="flex w-2/3 justify-between text-left py-2">
          <div>
            <p className="text-sm pl-1 pb-1 font-semibold">Bazén</p>
            <SegmentedControl
              value={pool}
              onChange={setPool}
              defaultValue={"25m"}
              color="rgba(18, 160, 216, 1)"
              data={[
                { label: "25m", value: "25" },
                { label: "50m", value: "50" },
              ]}
            />
          </div>
          <div>
            <p className="text-sm pl-1 pb-1 font-semibold">Časová osa</p>
            <SegmentedControl
              value={timeAxis}
              onChange={setTimeAxis}
              color="rgba(18, 160, 216, 1)"
              data={[
                { label: "Absolutní", value: "absolute" },
                { label: "Věková", value: "relative" },
              ]}
            />
          </div>
          <div>
            <p className="text-sm pl-1 pb-1 font-semibold">Mezičasy</p>
            <SegmentedControl
              value={intermediateTimes}
              onChange={setIntermediateTimes}
              color="rgba(18, 160, 216, 1)"
              data={[
                { label: "Vše", value: "all" },
                { label: "Pouze cílové", value: "onlyFinal" },
              ]}
            />
          </div>
          <div>
            <p className="text-sm pl-1 pb-1 font-semibold">Výsledky</p>
            <SegmentedControl
              value={resultType}
              onChange={setResultType}
              color="rgba(18, 160, 216, 1)"
              data={[
                { label: "Vše", value: "all" },
                { label: "Pouze zlepšení", value: "onlyImprovements" },
              ]}
            />
          </div>
        </div>
        <div>
          <p className="text-sm pl-1 pb-1 font-semibold text-white">S</p>
          <Button
            disabled={lastFetchedFilterHash !== "" ? !isOutdated : false}
            variant={isOutdated ? "filled" : "light"}
            color={isOutdated ? "#FFA500" : "rgba(18, 160, 216, 1)"}
            radius="md"
            size="sm"
            onClick={onFetchResults}
          >
            {lastFetchedFilterHash !== ""
              ? isOutdated
                ? "Aktualizovat data"
                : "Aktualizovat data"
              : "Načíst výsledky"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ComparisonFilterBar;
