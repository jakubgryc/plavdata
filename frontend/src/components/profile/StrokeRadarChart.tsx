import {
  Paper,
  Title,
  Group,
  ThemeIcon,
  useMantineColorScheme,
} from "@mantine/core";
import { IconChartRadar } from "@tabler/icons-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { StartsByStroke } from "../../schema/types";

interface StrokeRadarChartProps {
  startsByStroke: StartsByStroke;
}

function StrokeRadarChart({ startsByStroke }: StrokeRadarChartProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  // Map stroke codes to Czech names
  const strokeNames: Record<string, string> = {
    o: "Polohový závod",
    z: "Znak",
    p: "Prsa",
    m: "Motýlek",
    k: "Kraul",
  };

  // Transform data for radar chart
  const chartData = Object.entries(startsByStroke).map(([key, value]) => ({
    stroke: strokeNames[key as keyof StartsByStroke] || key,
    starts: value,
  }));

  return (
    <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
      <Group justify="space-between" mb={{ base: "xs", sm: "md" }}>
        <Group gap="xs">
          <ThemeIcon variant="transparent" color="blue">
            <IconChartRadar />
          </ThemeIcon>
          <Title order={3}>Starty podle způsobu</Title>
        </Group>
      </Group>

      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={chartData}>
          <PolarGrid stroke={isDark ? "#373A40" : "#dee2e6"} />
          <PolarAngleAxis
            dataKey="stroke"
            tick={{ fill: isDark ? "#C1C2C5" : "#495057", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, "dataMax - 100"]}
            tick={{ fill: isDark ? "#909296" : "#868e96", fontSize: 10 }}
          />
          <Radar
            name="Počet startů"
            dataKey="starts"
            stroke="#0ea5e9"
            fill="#0ea5e9"
            fillOpacity={0.6}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#25262b" : "#ffffff",
              border: `1px solid ${isDark ? "#373A40" : "#dee2e6"}`,
              borderRadius: "8px",
            }}
            labelStyle={{ color: isDark ? "#C1C2C5" : "#495057" }}
            itemStyle={{ color: "#0ea5e9" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Paper>
  );
}

export default StrokeRadarChart;
