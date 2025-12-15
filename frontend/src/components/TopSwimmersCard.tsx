import { Paper, Group, Stack, Title, Text, Box, Avatar } from "@mantine/core";

import type { TopSwimmer } from "../schema/types";

function getRowStyles(rank: number) {
  switch (rank) {
    case 1:
      return {
        bg: "yellow.0" as const,
        borderColor: "var(--mantine-color-yellow-3)",
        avatarColor: "yellow",
        withBorder: true,
        size: "md" as const,
        fontWeight: 700,
        pointsColor: "blue",
      };
    case 2:
      return {
        bg: "gray.1" as const,
        borderColor: "var(--mantine-color-gray-4)",
        avatarColor: "gray",
        withBorder: true,
        size: "sm" as const,
        fontWeight: 600,
        pointsColor: undefined,
      };
    case 3:
      return {
        bg: "orange.0" as const,
        borderColor: "var(--mantine-color-orange-3)",
        avatarColor: "orange",
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
        withBorder: false,
        size: "sm" as const,
        fontWeight: 600,
        pointsColor: undefined,
      };
  }
}

function SwimmerRow({ rank, name, surname, discipline, points }: TopSwimmer) {
  const styles = getRowStyles(rank);

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
          variant={rank <= 3 ? "filled" : "light"}
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
        </Box>
        <Box ta="right">
          <Text size={rank === 1 ? "lg" : "sm"} fw={700} c={styles.pointsColor}>
            {points}
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
