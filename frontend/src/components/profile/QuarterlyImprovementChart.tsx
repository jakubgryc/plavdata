import {
  Paper,
  Title,
  Group,
  ThemeIcon,
  useMantineColorScheme,
} from "@mantine/core";
import { IconTrendingUp } from "@tabler/icons-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { QuarterlyImprovement } from "../../schema/types";

interface QuarterlyImprovementChartProps {
  data: QuarterlyImprovement[];
}

function QuarterlyImprovementChart({ data }: QuarterlyImprovementChartProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
      <Group justify="space-between" mb={{ base: "xs", sm: "md" }}>
        <Group gap="xs">
          <ThemeIcon variant="transparent" color="blue">
            <IconTrendingUp />
          </ThemeIcon>
          <Title order={3}>Čtvrtletní zlepšení</Title>
        </Group>
      </Group>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "#373A40" : "#dee2e6"}
          />
          <XAxis
            dataKey="quarter"
            tick={{
              fill: isDark ? "#909296" : "#868e96",
              fontSize: 12,
            }}
          />
          <YAxis
            yAxisId="left"
            tick={{
              fill: isDark ? "#909296" : "#868e96",
              fontSize: 12,
            }}
            label={{
              value: "Počet startů",
              angle: -90,
              position: "insideLeft",
              style: { fill: isDark ? "#909296" : "#868e96", fontSize: 12 },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{
              fill: isDark ? "#909296" : "#868e96",
              fontSize: 12,
            }}
            label={{
              value: "Míra zlepšení (%)",
              angle: 90,
              position: "insideRight",
              style: { fill: isDark ? "#909296" : "#868e96", fontSize: 12 },
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
            formatter={(value: number, name: string) => {
              if (name === "improvementRate") {
                return [`${value}%`, "Míra zlepšení"];
              }
              if (name === "totalStarts") {
                return [value, "Celkem startů"];
              }
              if (name === "improvements") {
                return [value, "Zlepšení"];
              }
              return [value, name];
            }}
          />
          <Legend
            wrapperStyle={{
              fontSize: "12px",
              color: isDark ? "#c1c2c5" : "#495057",
            }}
            formatter={(value: string) => {
              if (value === "totalStarts") return "Celkem startů";
              if (value === "improvements") return "Zlepšení";
              if (value === "improvementRate") return "Míra zlepšení (%)";
              return value;
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="totalStarts"
            fill="#94a3b8"
            radius={[4, 4, 0, 0]}
            opacity={0.7}
          />
          <Bar
            yAxisId="left"
            dataKey="improvements"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="improvementRate"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={{ fill: "#0ea5e9", r: 3 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Paper>
  );
}

export default QuarterlyImprovementChart;
