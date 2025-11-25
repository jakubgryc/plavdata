/**
 * @TODO
 *  - Relative domain ticks when removing oldest swimmer
 *    does not work properly, need to switch to absolute and back to relative
 *    for it to work
 */

import { useEffect, useState } from "react";
import { Button } from "@mantine/core";
import { GROUPS, POOLS, DISCIPLINES } from "../utils/constants";
import { MultiSelect, SegmentedControl, Select } from "@mantine/core";
import { format } from "date-fns";
import type { SwimmerResults, GroupedSwimmers } from "../schema/types";
import { parseTimeFromMillis, formatDateFromString } from "../utils/timeUtils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { API_BASE_URL } from "../../config";

function findMinMaxDates(data: SwimmerResults[]) {
  let minDate = Infinity;
  let maxDate = -Infinity;

  data.forEach((swimmerData) => {
    swimmerData.results.forEach((result) => {
      const resultDate = new Date(result.date).getTime();
      if (resultDate < minDate) minDate = resultDate;
      if (resultDate > maxDate) maxDate = resultDate;
    });
  });

  return [minDate, maxDate];
}

function findMinMaxTimes(data: SwimmerResults[]) {
  let minTime = Infinity;
  let maxTime = -Infinity;

  data.forEach((swimmerData) => {
    // loop only through results that are not DNF (6039990)
    // and have improvement flag true
    swimmerData.results
      .filter((result) => result.time !== 6039990)
      .forEach((result) => {
        const resultTime = result.time;
        if (resultTime < minTime) minTime = resultTime;
        if (resultTime > maxTime) maxTime = resultTime;
      });
  });

  return [minTime, maxTime];
}

function findYoungestAndOldestYear(data: SwimmerResults[]) {
  if (data.length === 0) return { youngest: null, oldest: null };

  let youngest = -Infinity;
  let oldest = Infinity;

  data.forEach((swimmerData) => {
    const lastResultDate =
      swimmerData.results[swimmerData.results.length - 1].date;
    const firstResult = swimmerData.results[0].date;
    const lastResultYear = new Date(lastResultDate).getFullYear();
    const firstResultYear = new Date(firstResult).getFullYear();
    if (lastResultYear > youngest) youngest = lastResultYear;
    if (firstResultYear < oldest) oldest = firstResultYear;
  });
  return { youngest, oldest };
}

function findOldestBirthYear(data: SwimmerResults[]): number {
  if (data.length === 0) return 0;

  return Math.min(...data.map((swimmerData) => swimmerData.swimmer.birth_year));
}

function createRelativeDomainTicks(data: SwimmerResults[]): number[] {
  const { youngest, oldest } = findYoungestAndOldestYear(data);

  const ticks: number[] = [];
  // create ticks, if the youngest is 2023, oldest is 2010,
  // but convert them to timestamps (jan 1st of each year)
  if (youngest !== null && oldest !== null) {
    for (let year = oldest; year <= youngest; year++) {
      const date = new Date(year, 0, 1); // January 1st of the year
      ticks.push(date.getTime());
    }
  }
  return ticks;
}

function shiftResults(data: SwimmerResults[]): SwimmerResults[] {
  if (data.length === 0) return data;

  const oldestBirthYear = findOldestBirthYear(data);

  return data.map((swimmerData) => {
    const birthYearDiff = swimmerData.swimmer.birth_year - oldestBirthYear;
    const shiftedResults = swimmerData.results.map((result) => {
      const originalDate = new Date(result.date);
      const shiftedDate = new Date(
        originalDate.setFullYear(originalDate.getFullYear() - birthYearDiff),
      );
      return {
        ...result,
        date: shiftedDate.toISOString().slice(0, 19),
      };
    });
    return {
      ...swimmerData,
      results: shiftedResults,
    };
  });
}

function findSwimmerIds(
  selectedSwimmers: string[],
  groupedSwimmers: GroupedSwimmers[],
): number[] {
  const swimmerIds: number[] = [];
  selectedSwimmers.forEach((selected) => {
    groupedSwimmers.forEach(({ swimmers }) => {
      swimmers.forEach((swimmer) => {
        const fullName = `${swimmer.surname} ${swimmer.name}`;
        if (fullName === selected) {
          swimmerIds.push(swimmer.id);
        }
      });
    });
  });
  return swimmerIds;
}

function CompareSwimmers() {
  const [results, setResults] = useState<SwimmerResults[]>([]);
  const [groupedSwimmers, setGroupedSwimmers] = useState<GroupedSwimmers[]>([]);
  const [selectedSwimmers, setSelectedSwimmers] = useState<string[]>([]);
  const [pool, setPool] = useState<string>("25m");
  const [timeAxis, setTimeAxis] = useState<string>("absolute");
  const [intermediateTimes, setIntermediateTimes] =
    useState<string>("onlyFinal");
  const [resultType, setResultType] = useState<string>("all");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(
    DISCIPLINES[0],
  );
  const [oldestBirthYear, setOldestBirthYear] = useState<number | null>(null);
  const [parsedResults, setParsedResults] = useState<SwimmerResults[]>([]);
  const [relativeDomainTicks, setRelativeDomainTicks] = useState<number[]>([]);

  useEffect(() => {
    if (timeAxis === "absolute") {
      setRelativeDomainTicks([]);
      return;
    }
    const ticks = createRelativeDomainTicks(parsedResults);
    setRelativeDomainTicks(ticks);
  }, [parsedResults, timeAxis]);

  const dateFormatterAbsolute = (date) => {
    return format(new Date(date), "MM/yy");
  };

  const dateFormatterRelative = (date) => {
    if (oldestBirthYear === null) return "";
    const year = new Date(date).getFullYear();
    const age = year - oldestBirthYear;
    return `${age.toString()} let`;
  };

  useEffect(() => {
    if (timeAxis === "absolute") {
      return;
    }
    const oldestBirthYear = findOldestBirthYear(parsedResults);
    setOldestBirthYear(oldestBirthYear);
  }, [parsedResults, timeAxis]);

  useEffect(() => {
    const fetchGroupedSwimmers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/swimmers/grouped`, {
          method: "GET",
        });
        if (!response.ok) throw new Error("Failed to fetch grouped swimmers");
        const data = await response.json();
        setGroupedSwimmers(data);
      } catch (error) {
        console.error("Error fetching grouped swimmers:", error);
      }
    };

    fetchGroupedSwimmers();
  }, []);

  useEffect(() => {
    let shiftedResults = results;
    if (timeAxis === "relative") {
      shiftedResults = shiftResults(results);
    }
    setParsedResults(shiftedResults);
  }, [results, resultType, timeAxis, intermediateTimes]);

  const fetchComparisonResults = async () => {
    try {
      const swimmerIds = findSwimmerIds(selectedSwimmers, groupedSwimmers);
      let discipline = "";
      if (selectedDiscipline) {
        // convert VZ to K for API
        if (selectedDiscipline.endsWith(" VZ")) {
          discipline = selectedDiscipline.replace(" VZ", " K");
        } else {
          discipline = selectedDiscipline;
        }
      }
      const response = await fetch(`${API_BASE_URL}/api/results/temp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          swimmer_ids: swimmerIds,
          discipline_code: discipline,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch comparison results");
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error fetching comparison results:", error);
    }
  };

  return (
    <div className="flex flex-col w-full py-5 ">
      <h2 className="text-2xl font-semibold mb-4">Srovnání výsledků</h2>
      <div className="flex-col w-full justify-between  border px-8 border-gray-900 bg-white rounded-md shadow-lg">
        <div className="flex justify-between  py-1  border-0 border-black">
          <div className="w-1/2 ">
            <MultiSelect
              label="Plavci"
              placeholder="Vyber až 5 plavců"
              searchable
              maxValues={5}
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
                  { label: "25m", value: "25m" },
                  { label: "50m", value: "50m" },
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
              variant="light"
              color="rgba(18, 160, 216, 1)"
              radius="md"
              size="sm"
              onClick={fetchComparisonResults}
            >
              Načíst výsledky
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-col w-full  border px-8 mt-4 border-gray-900 bg-white rounded-md shadow-lg">
        <h2 className="text-xl font-semibold mb-4">
          Srovnání - {selectedDiscipline}
        </h2>
        <ResponsiveContainer width="100%" aspect={1.618} maxHeight={570}>
          <LineChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis
              dataKey="name"
              type="number"
              domain={findMinMaxDates(parsedResults)}
              tickFormatter={
                timeAxis === "absolute"
                  ? dateFormatterAbsolute
                  : dateFormatterRelative
              }
              padding={{ left: 20, right: 20 }}
              ticks={timeAxis === "relative" ? relativeDomainTicks : undefined}
            />
            <YAxis
              tickFormatter={parseTimeFromMillis}
              domain={findMinMaxTimes(parsedResults)}
              padding={{ bottom: 20 }}
            />
            <CartesianGrid strokeDasharray="9 9" />
            <Tooltip />
            <Legend />
            {parsedResults.map((swimmerData, index) => {
              const colors = [
                "#8884d8",
                "#82ca9d",
                "#ff7300",
                "#ff0000",
                "#00ff00",
                "#0000ff",
              ];
              const color = colors[index % colors.length];
              return (
                <Line
                  key={index}
                  dot={{ fill: color, r: 3 }}
                  // dot={false}
                  type="monotone"
                  dataKey="time"
                  data={swimmerData.results
                    .filter((result) => {
                      // Always exclude invalid times (6039990 = DNS/DNF)
                      if (result.time === 6039990) return false;

                      if (
                        intermediateTimes === "onlyFinal" &&
                        result.split_time
                      ) {
                        return false;
                      }
                      return !(
                        resultType === "onlyImprovements" && !result.improvement
                      );
                    })
                    .map((result) => ({
                      name: new Date(result.date).getTime(), // X-axis: timestamp
                      time: result.time, // Y-axis: time in centiseconds
                    }))}
                  name={`${swimmerData.swimmer.name} ${swimmerData.swimmer.surname}`}
                  stroke={color}
                  strokeWidth={3}
                  connectNulls
                />
              );
            })}
            <Tooltip
              formatter={(value, name) => [parseTimeFromMillis(value), name]}
              labelFormatter={formatDateFromString}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default CompareSwimmers;
