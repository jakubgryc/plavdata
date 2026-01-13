import { Paper, Title, Group, ThemeIcon } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMantineColorScheme } from "@mantine/core";
import type { SwimmerStartsByYear } from "../../schema/types";

interface PerformanceChartProps {
  data: SwimmerStartsByYear[];
}

function PerformanceChart({ data }: PerformanceChartProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
      <Group justify="space-between" mb={{ base: "xs", sm: "md" }}>
        <Group gap="xs">
          <ThemeIcon variant="transparent" color="blue">
            <IconChartBar />
          </ThemeIcon>
          <Title order={3}>Vývoj aktivity (počet startů)</Title>
        </Group>
      </Group>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis
            dataKey="year"
            tick={{
              fill: isDark ? "#909296" : "#868e96",
              fontSize: 12,
            }}
          />
          <YAxis
            tick={{
              fill: isDark ? "#909296" : "#868e96",
              fontSize: 12,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1a1b1e" : "#ffffff",
              border: `1px solid ${isDark ? "#373A40" : "#dee2e6"}`,
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{
              color: isDark ? "#c1c2c5" : "#495057",
              fontWeight: 600,
            }}
            cursor={{
              fill: isDark ? "rgba(14, 165, 233, 0.1)" : "rgba(8,138,198,0.1)",
              radius: 8,
            }}
          />
          <Bar
            dataKey="starts"
            fill="#0ea5e9"
            radius={[8, 8, 0, 0]}
            activeBar={{
              stroke: isDark ? "#ffffff" : "#000000",
              strokeWidth: 2,
            }}
          />
          {/*  <Bar dataKey="starts" fill="#00a5e9" radius={[8, 8, 0, 0]} />*/}
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}

export default PerformanceChart;
