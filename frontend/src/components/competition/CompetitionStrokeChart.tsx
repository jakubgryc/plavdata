import { Group, Paper, ThemeIcon, Title, useMantineColorScheme } from "@mantine/core";
import { IconChartDonut } from "@tabler/icons-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CompetitionSwimmerResult } from "../../schema/types";

interface CompetitionStrokeChartProps {
  swimmers: CompetitionSwimmerResult[];
}

const STROKE_LABELS: Record<string, string> = {
  VZ: "Kraul",
  Z: "Znak",
  P: "Prsa",
  M: "Motýlek",
  PZ: "PZ",
};

const STROKE_COLORS: Record<string, string> = {
  VZ: "#0ea5e9",
  Z: "#8b5cf6",
  P: "#22c55e",
  M: "#f59e0b",
  PZ: "#ef4444",
};

function CompetitionStrokeChart({ swimmers }: CompetitionStrokeChartProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const counts: Record<string, number> = {};
  for (const swimmer of swimmers) {
    for (const result of swimmer.results) {
      if (result.relayPart) continue;
      const parts = result.disciplineCode.trim().toUpperCase().split(/\s+/);
      const stroke = parts[1] ?? parts[0];
      const key = stroke === "K" ? "VZ" : stroke === "O" ? "PZ" : stroke;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }

  const data = Object.entries(counts)
    .map(([stroke, count]) => ({
      stroke: STROKE_LABELS[stroke] ?? stroke,
      key: stroke,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
      <Group justify="space-between" mb={{ base: "xs", sm: "md" }}>
        <Group gap="xs">
          <ThemeIcon variant="transparent" color="blue">
            <IconChartDonut />
          </ThemeIcon>
          <Title order={3}>Starty podle způsobu</Title>
        </Group>
      </Group>
      <div>
        <ResponsiveContainer width="100%" height={data.length * 52 + 20}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
          >
            <XAxis
              type="number"
              tick={{ fill: isDark ? "#909296" : "#868e96", fontSize: 12 }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="stroke"
              width={72}
              tick={{ fill: isDark ? "#909296" : "#868e96", fontSize: 13 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1a1b1e" : "#ffffff",
                border: `1px solid ${isDark ? "#373A40" : "#dee2e6"}`,
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [value, "Startů"]}
              labelFormatter={(label: string) => (label === "PZ" ? "Polohový závod" : label)}
              labelStyle={{
                color: isDark ? "#c1c2c5" : "#495057",
                fontWeight: 600,
              }}
              itemStyle={{
                color: isDark ? "#c1c2c5" : "#495057",
              }}
              cursor={{
                fill: isDark ? "rgba(14, 165, 233, 0.1)" : "rgba(8, 138, 198, 0.1)",
                radius: 8,
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 8, 8, 0]}
              activeBar={{
                stroke: isDark ? "#ffffff" : "#000000",
                strokeWidth: 2,
              }}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={STROKE_COLORS[entry.key] ?? "#0ea5e9"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Paper>
  );
}

export default CompetitionStrokeChart;
