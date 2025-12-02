import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format } from "date-fns";

import {
  createAbsoluteDomainTicks,
  createRelativeDomainTicks,
  createYAxisTicks,
  findOldestBirthYear,
  findMinMaxTimes,
} from "../utils/chartUtils.ts";

import { getGraphColor } from "../utils/constants";
import { parseTimeFromMillis, formatDateFromString } from "../utils/timeUtils";

import type { SwimmerResults } from "../schema/types";

interface ComparisonSwimmerChartProps {
  parsedResults: SwimmerResults[];
  currentDiscipline: string | null;
  timeAxis: string;
  intermediateTimes: string;
  resultType: string;
}
function ComparisonSwimmerChart({
  parsedResults,
  currentDiscipline,
  timeAxis,
  intermediateTimes,
  resultType,
}: ComparisonSwimmerChartProps) {
  const [oldestBirthYear, setOldestBirthYear] = useState<number | null>(null);

  useEffect(() => {
    const oldestBirthYear = findOldestBirthYear(parsedResults);
    setOldestBirthYear(oldestBirthYear);
  }, [parsedResults]);

  const yAxisTicks = useMemo(() => {
    if (currentDiscipline === null) return [];
    const disciplineLength = parseInt(currentDiscipline.split(" ")[0], 10);
    const [minTime, maxTime] = findMinMaxTimes(
      parsedResults,
      intermediateTimes === "onlyFinal",
      resultType === "onlyImprovements",
    );
    return createYAxisTicks(minTime, maxTime, disciplineLength);
  }, [parsedResults, currentDiscipline, intermediateTimes, resultType]);

  const dateFormatterAbsolute = (date: number) => {
    return format(new Date(date), "yyyy");
  };

  const dateFormatterRelative = (date: number) => {
    if (oldestBirthYear === null) return "";
    const year = new Date(date).getFullYear();
    const age = year - oldestBirthYear;
    return `${age.toString()} let`;
  };

  return (
    <div className="flex-col w-full border px-8 mt-4 border-gray-900 bg-white rounded-md shadow-lg">
      <h2 className="text-xl items-center font-semibold mb-4 pt-2">
        Srovnání - {currentDiscipline}
      </h2>
      <LineChart
        responsive
        style={{ width: "100%", maxHeight: 570, aspectRatio: 1.618 }}
        margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
      >
        <XAxis
          dataKey="name"
          type="number"
          tickFormatter={
            timeAxis === "absolute"
              ? dateFormatterAbsolute
              : dateFormatterRelative
          }
          padding={{ left: 20, right: 20 }}
          ticks={
            timeAxis === "relative"
              ? createRelativeDomainTicks(parsedResults)
              : createAbsoluteDomainTicks(parsedResults)
          }
        />
        <YAxis
          tickFormatter={parseTimeFromMillis}
          ticks={yAxisTicks}
          padding={{ bottom: 20 }}
        />
        <CartesianGrid strokeDasharray="9 9" />
        <Legend />
        {parsedResults.map((swimmerData, index) => {
          const color = getGraphColor(index);
          return (
            <Line
              key={index}
              dot={{ fill: color, r: 1.5 }}
              type="monotone"
              dataKey="time"
              data={swimmerData.results
                .filter((result, index) => {
                  if (result.time === 6039990) return false;
                  if (
                    intermediateTimes === "onlyFinal" &&
                    result.split_time &&
                    index !== 0
                  ) {
                    return false;
                  }
                  return !(
                    resultType === "onlyImprovements" &&
                    !result.improvement &&
                    index !== 0
                  );
                })
                .map((result) => ({
                  name: new Date(result.date).getTime(),
                  time: result.time,
                }))}
              name={`${swimmerData.swimmer.surname} ${swimmerData.swimmer.name}`}
              stroke={color}
              strokeWidth={2}
              connectNulls
            />
          );
        })}
        <Tooltip
          formatter={(value, name) => [
            parseTimeFromMillis(Number(value)),
            name,
          ]}
          labelFormatter={formatDateFromString}
        />
      </LineChart>
    </div>
  );
}

export default ComparisonSwimmerChart;
