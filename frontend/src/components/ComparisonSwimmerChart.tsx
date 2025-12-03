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
import { Flex, Paper, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import {
  createAbsoluteDomainTicks,
  createRelativeDomainTicks,
  createYAxisTicks,
  findOldestBirthYear,
  findMinMaxTimes,
} from "../utils/chartUtils.ts";

import { getGraphColor, DNF_TIME } from "../utils/constants";
import { parseTimeFromMillis, formatDateFromMs } from "../utils/timeUtils";

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
  const isMobile = useMediaQuery("(max-width: 768px)");

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
    <Paper
      p={{ base: "sm", md: "lg" }}
      shadow="md"
      radius="md"
      withBorder
      className="mt-4 w-full border-2 border-gray-900"
    >
      <Title order={3} size="xl" fw={600} mb="md" pt="xs">
        Srovnání - {currentDiscipline}
      </Title>
      <Flex direction="column" w="100%" gap="md">
        <LineChart
          responsive
          style={{
            width: "100%",
            height: isMobile ? 370 : 570,
          }}
          margin={
            isMobile
              ? { top: 5, right: 5, left: 0, bottom: 5 }
              : { top: 10, right: 10, left: 10, bottom: 10 }
          }
        >
          <XAxis
            dataKey="name"
            type="number"
            tick={{ fontSize: isMobile ? 10 : 12 }}
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
            tick={{ fontSize: isMobile ? 10 : 12 }}
            tickFormatter={parseTimeFromMillis}
            ticks={yAxisTicks}
            padding={{ bottom: 20 }}
          />
          <CartesianGrid strokeDasharray="9 9" />
          <Legend wrapperStyle={isMobile ? { fontSize: "12px" } : {}} />
          {parsedResults.map((swimmerData, index) => {
            const color = getGraphColor(index);
            return (
              <Line
                key={index}
                dot={{ fill: color, r: isMobile ? 1 : 1.5 }}
                type="monotone"
                dataKey="time"
                data={swimmerData.results
                  .filter((result, index) => {
                    if (result.time === DNF_TIME) return false;
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
                strokeWidth={isMobile ? 1.5 : 2}
                connectNulls
              />
            );
          })}
          <Tooltip
            contentStyle={isMobile ? { fontSize: "12px" } : {}}
            formatter={(value, name) => [
              parseTimeFromMillis(Number(value)),
              name,
            ]}
            labelFormatter={
              timeAxis === "absolute" ? formatDateFromMs : () => ""
            }
          />
        </LineChart>
      </Flex>
    </Paper>
  );
}

export default ComparisonSwimmerChart;
