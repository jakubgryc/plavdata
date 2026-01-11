import { Paper, Group, Stack, Title, Text, Box, Avatar } from "@mantine/core";
import { useTheme } from "../hooks/useTheme";
import { parseTimeFromMillis } from "../utils/timeUtils";

import type { TopSwimmer } from "../schema/types";

function getRowStyles(rank: number, colorScheme: "light" | "dark" | "auto") {
  const isDark = colorScheme === "dark";

  switch (rank) {
    case 1:
      return {
        bg: isDark
          ? ("rgba(251, 191, 36, 0.1)" as const)
          : ("#fef3c7" as const), // Very light gold background in dark
        borderColor: isDark ? ("#fcd34d" as const) : ("#f59e0b" as const), // Bright gold border in dark
        avatarColor: isDark ? ("yellow" as const) : ("#d97706" as const), // Use theme color in dark
        avatarVariant: "filled",
        withBorder: true,
        size: "md" as const,
        fontWeight: 700,
        pointsColor: "blue",
      };
    case 2:
      return {
        bg: isDark
          ? ("rgba(156, 163, 175, 0.1)" as const)
          : ("#f3f4f6" as const), // Very light silver background in dark
        borderColor: isDark ? ("#d1d5db" as const) : ("#9ca3af" as const), // Bright silver border in dark
        avatarColor: isDark ? ("gray" as const) : ("#6b7280" as const), // Use theme color in dark
        avatarVariant: "filled",
        withBorder: true,
        size: "sm" as const,
        fontWeight: 600,
        pointsColor: undefined,
      };
    case 3:
      return {
        bg: isDark
          ? ("rgba(251, 146, 60, 0.1)" as const)
          : ("#fed7aa" as const), // Very light bronze background in dark
        borderColor: isDark ? ("#fdba74" as const) : ("#fb923c" as const), // Bright bronze border in dark
        avatarColor: isDark ? ("orange" as const) : ("#ea580c" as const), // Use theme color in dark
        avatarVariant: "filled",
        withBorder: true,
        size: "sm" as const,
        fontWeight: 600,
        pointsColor: undefined,
      };
    default:
      return {
        bg: undefined,
        borderColor: undefined,
        avatarColor: "gray",
        avatarVariant: "light" as const,
        withBorder: false,
        size: "sm" as const,
        fontWeight: 600,
        pointsColor: undefined,
      };
  }
}

function SwimmerRow({
  rank,
  name,
  surname,
  discipline,
  points,
  time,
}: TopSwimmer) {
  const { colorScheme } = useTheme();
  const styles = getRowStyles(rank, colorScheme);

  return (
    <Paper
      p={rank === 1 ? "sm" : "xs"}
      radius="md"
      bg={styles.bg}
      withBorder={styles.withBorder}
      style={
        styles.borderColor ? { borderColor: styles.borderColor } : undefined
      }
    >
      <Group gap="sm" wrap="nowrap">
        <Avatar
          size={styles.size}
          radius="xl"
          color={styles.avatarColor}
          variant={styles.avatarVariant}
        >
          {rank}
        </Avatar>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={styles.fontWeight} truncate>
            {surname} {name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {discipline}
          </Text>
          <Text size="xs" c="dimmed" fw={500}>
            {parseTimeFromMillis(time)}
          </Text>
        </Box>
        <Box ta="right">
          <Text size={rank === 1 ? "lg" : "sm"} fw={700} c={styles.pointsColor}>
            {points}
          </Text>
          <Text size="xs" c="dimmed">
            bodů
          </Text>
        </Box>
      </Group>
    </Paper>
  );
}

interface TopSwimmersCardProps {
  title: string;
  swimmers: TopSwimmer[];
}

function TopSwimmersCard({ title, swimmers }: TopSwimmersCardProps) {
  return (
    <Paper p="lg" radius="md" withBorder shadow="sm">
      <Group justify="space-between" mb="lg">
        <Title order={4}>{title}</Title>
      </Group>
      <Stack gap="xs">
        {swimmers.map((swimmer) => (
          <SwimmerRow key={swimmer.rank} {...swimmer} />
        ))}
      </Stack>
    </Paper>
  );
}

export default TopSwimmersCard;
