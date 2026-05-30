import {
  Button,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMilitaryRank } from "@tabler/icons-react";
import type { SwimmerTopResult } from "../../schema/types";
import { parseTimeFromMillis } from "../../utils/timeUtils";

interface TopResultsCardProps {
  results: SwimmerTopResult[];
}

function TopResultsCard({ results }: TopResultsCardProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const topResults = results.slice(0, 3);
  const hasMore = results.length > 3;

  return (
    <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
      <Group gap="xs" mb={{ base: "xs", sm: "md" }}>
        <ThemeIcon size="md" variant="transparent" color="blue">
          <IconMilitaryRank size={20} />
        </ThemeIcon>
        <Title order={3}>Nejlepší výkony</Title>
      </Group>

      <Stack gap="sm">
        {topResults.map((result, index) => (
          <Paper
            key={`${result.discipline}-${index}`}
            p={{ base: "xs", sm: "md" }}
            radius="md"
            withBorder
            style={{
              backgroundColor:
                index === 0
                  ? isDark
                    ? "rgba(251, 191, 36, 0.1)"
                    : "rgba(251, 191, 36, 0.05)"
                  : undefined,
              borderColor:
                index === 0
                  ? isDark
                    ? "rgba(251, 191, 36, 0.3)"
                    : "rgba(251, 191, 36, 0.2)"
                  : undefined,
            }}
          >
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <div>
                <Text size="xs" tt="uppercase" fw={700} c={index === 0 ? "yellow.6" : "dimmed"}>
                  {result.discipline}
                </Text>
                <Text size="xl" fw={700} lh={1.2} className="top-results-time">
                  {parseTimeFromMillis(result.time)}
                </Text>
              </div>
              <div style={{ textAlign: "right" }}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Body
                </Text>
                <Text size="lg" fw={700} c="blue" lh={1.2} className="top-results-points">
                  {result.points}
                </Text>
              </div>
            </Group>
          </Paper>
        ))}

        {hasMore && (
          <Button variant="subtle" fullWidth>
            Zobrazit všechny rekordy
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

export default TopResultsCard;
