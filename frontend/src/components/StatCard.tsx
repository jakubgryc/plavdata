import { Paper, Group, Title, Text, ThemeIcon, Badge } from "@mantine/core";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  type Icon,
} from "@tabler/icons-react";

interface StatCardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon: Icon;
  color: string;
  periodType?: "year" | "season";
  currentPeriodLabel?: string;
  previousPeriodLabel?: string;
}

function getTrend(current: number, previous?: number) {
  if (previous === undefined || previous === 0) {
    return { percent: 0, color: "gray", icon: IconMinus };
  }

  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change);

  if (rounded > 5) {
    return { percent: rounded, color: "green", icon: IconTrendingUp };
  } else if (rounded < -5) {
    return { percent: rounded, color: "red", icon: IconTrendingDown };
  } else {
    return { percent: rounded, color: "yellow", icon: IconMinus };
  }
}

function StatCard({
  title,
  value,
  previousValue,
  icon: Icon,
  color,
  periodType = "year",
  currentPeriodLabel,
  previousPeriodLabel,
}: StatCardProps) {
  const trend = getTrend(value, previousValue);
  const TrendIcon = trend.icon;

  // Generate labels based on period type
  const currentLabel =
    currentPeriodLabel ||
    (periodType === "season" ? "tuto sezónu" : "tento rok");
  const previousLabel =
    previousPeriodLabel ||
    (periodType === "season" ? "minulou sezónu" : "předešlý rok");

  return (
    <Paper p="lg" radius="md" withBorder shadow="sm">
      <Group justify="space-between" mb="md">
        <ThemeIcon size="lg" radius="md" variant="light" color={color}>
          <Icon size={20} />
        </ThemeIcon>
        {previousValue !== undefined && (
          <Badge
            size="sm"
            variant="light"
            color={trend.color}
            leftSection={<TrendIcon size={12} />}
          >
            {trend.percent > 0 ? "+" : ""}
            {trend.percent}%
          </Badge>
        )}
      </Group>
      <Text size="sm" c="dimmed" fw={500} mb={4}>
        {title}
      </Text>
      <Group gap={6} align="baseline" wrap="nowrap">
        <Title order={2} fw={700}>
          {value.toLocaleString("cs-CZ")}
        </Title>
        <Text size="xs" c="dimmed">
          {currentLabel}
        </Text>
      </Group>
      {previousValue !== undefined && (
        <Text size="xs" c="dimmed" mt={4}>
          {previousValue.toLocaleString("cs-CZ")} {previousLabel}
        </Text>
      )}
    </Paper>
  );
}

export default StatCard;
