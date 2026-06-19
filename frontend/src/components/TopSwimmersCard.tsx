import { Avatar, Box, Button, Collapse, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { Link } from "react-router";
import { useTheme } from "../hooks/useTheme";
import type { TopSwimmer } from "../schema/types";
import { parseTimeFromMillis } from "../utils/timeUtils";

function getRowStyles(rank: number, colorScheme: "light" | "dark" | "auto") {
  const isDark = colorScheme === "dark";

  switch (rank) {
    case 1:
      return {
        bg: isDark ? ("rgba(251, 191, 36, 0.1)" as const) : ("#fef3c7" as const), // Very light gold background in dark
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
        bg: isDark ? ("rgba(156, 163, 175, 0.1)" as const) : ("#f3f4f6" as const), // Very light silver background in dark
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
        bg: isDark ? ("rgba(251, 146, 60, 0.1)" as const) : ("#fed7aa" as const), // Very light bronze background in dark
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
        borderColor: isDark ? "rgba(55, 65, 81, 0.5)" : "rgba(229, 231, 235, 0.8)",
        avatarColor: "gray",
        avatarVariant: "light" as const,
        withBorder: true,
        size: "sm" as const,
        fontWeight: 600,
        pointsColor: undefined,
      };
  }
}

function SwimmerRow({ rank, name, surname, discipline, points, time, swimmerId }: TopSwimmer) {
  const { colorScheme } = useTheme();
  const styles = getRowStyles(rank, colorScheme);

  return (
    <Paper
      p={rank === 1 ? "sm" : "xs"}
      radius="md"
      bg={styles.bg}
      withBorder={styles.withBorder}
      style={{ ...(styles.borderColor ? { borderColor: styles.borderColor } : {}) }}
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
          <Text
            className="textHoverLink"
            component={Link}
            to={`/swimmer/${swimmerId}`}
            size="sm"
            fw={styles.fontWeight}
            truncate
          >
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
  showAll: boolean;
  onToggle: () => void;
}

function TopSwimmersCard({ title, swimmers, showAll, onToggle }: TopSwimmersCardProps) {
  const topSwimmers = swimmers.slice(0, 5);
  const additionalSwimmers = swimmers.slice(5);
  const hasAdditionalSwimmers = additionalSwimmers.length > 0;

  return (
    <Paper p="lg" radius="md" withBorder shadow="sm">
      <Group justify="space-between" mb="lg">
        <Title order={4}>{title}</Title>
      </Group>
      <Stack gap="xs">
        {topSwimmers.map((swimmer) => (
          <SwimmerRow key={swimmer.rank} {...swimmer} />
        ))}

        {hasAdditionalSwimmers && (
          <>
            <Collapse in={showAll}>
              <Stack gap="xs" mt="xs">
                {additionalSwimmers.map((swimmer) => (
                  <SwimmerRow key={swimmer.rank} {...swimmer} />
                ))}
              </Stack>
            </Collapse>

            <Button
              variant="subtle"
              size="xs"
              fullWidth
              onClick={onToggle}
              rightSection={
                <IconChevronDown
                  size={16}
                  style={{
                    transform: showAll ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 200ms",
                  }}
                />
              }
            >
              {showAll ? "Skrýt" : `Zobrazit dalších ${additionalSwimmers.length}`}
            </Button>
          </>
        )}
      </Stack>
    </Paper>
  );
}

export default TopSwimmersCard;
