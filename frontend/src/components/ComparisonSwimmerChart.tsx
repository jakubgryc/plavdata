import { Paper, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "../hooks/useTheme";
import type { SwimmerResults } from "../schema/types";
import {
  createAbsoluteDomainTicks,
  createRelativeDomainTicks,
  createYAxisTicks,
  findMinMaxTimes,
  findOldestBirthYear,
} from "../utils/chartUtils.ts";
import { DNF_TRESHOLD, getGraphColor } from "../utils/constants";
import { formatDateFromMs, parseTimeFromMillis } from "../utils/timeUtils";

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
  const { colorScheme, theme } = useTheme();

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
    <Paper p={{ base: "sm", md: "lg" }} shadow="md" radius="md" withBorder w="100%" mt="md">
      <Title order={3} size="xl" fw={600} mb="md" pt="xs">
        Srovnání - {currentDiscipline}
      </Title>
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
          tick={{
            fontSize: isMobile ? 14 : 15,
            fill: colorScheme === "dark" ? theme.colors.gray[3] : theme.colors.gray[7],
          }}
          tickFormatter={timeAxis === "absolute" ? dateFormatterAbsolute : dateFormatterRelative}
          padding={{ left: 20, right: 20 }}
          ticks={
            timeAxis === "relative"
              ? createRelativeDomainTicks(parsedResults)
              : createAbsoluteDomainTicks(parsedResults)
          }
        />
        <YAxis
          tick={{
            fontSize: isMobile ? 14 : 15,
            fill: colorScheme === "dark" ? theme.colors.gray[3] : theme.colors.gray[7],
          }}
          tickFormatter={parseTimeFromMillis}
          ticks={yAxisTicks}
          padding={{ bottom: 20 }}
        />
        <CartesianGrid strokeDasharray={colorScheme === "dark" ? "1 3" : ""} />
        <Legend
          wrapperStyle={{
            fontSize: isMobile ? "12px" : "14px",
            color: colorScheme === "dark" ? theme.colors.gray[3] : theme.colors.gray[7],
          }}
        />
        {parsedResults.map((swimmerData, index) => {
          const color = getGraphColor(index);
          return (
            <Line
              key={swimmerData.swimmer.id}
              dot={{ fill: color, r: isMobile ? 1 : 1.5 }}
              type="monotone"
              dataKey="time"
              data={swimmerData.results
                .filter((result, index) => {
                  if (result.time > DNF_TRESHOLD) return false;
                  if (intermediateTimes === "onlyFinal" && result.split_time && index !== 0) {
                    return false;
                  }
                  return !(resultType === "onlyImprovements" && !result.improvement && index !== 0);
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
          contentStyle={{
            fontSize: isMobile ? "12px" : "14px",
            backgroundColor: colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
            border: `1px solid ${colorScheme === "dark" ? theme.colors.gray[7] : theme.colors.gray[4]}`,
            color: colorScheme === "dark" ? theme.colors.gray[3] : theme.colors.gray[7],
          }}
          formatter={(value, name) => [parseTimeFromMillis(Number(value)), name]}
          labelFormatter={timeAxis === "absolute" ? formatDateFromMs : () => ""}
        />
      </LineChart>
    </Paper>
  );
}

export default ComparisonSwimmerChart;
