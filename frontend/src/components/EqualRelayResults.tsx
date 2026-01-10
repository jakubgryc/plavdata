import {
  Card,
  Stack,
  Group,
  Grid,
  Skeleton,
  useMantineColorScheme,
  Text,
  rem,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { EqualRelayTeamCard } from "./EqualRelayTeamCard.tsx";
import { TEAM_COLORS } from "../utils/constants";
import type { EqualRelayResult } from "../schema/types";

interface EqualRelayResultsProps {
  results: EqualRelayResult | null;
  isLoading: boolean;
}

export function EqualRelayResults({
  results,
  isLoading,
}: EqualRelayResultsProps) {
  const { colorScheme } = useMantineColorScheme();

  if (isLoading) {
    return (
      <Grid>
        <Grid.Col span={{ base: 12 }}>
          <Card withBorder shadow="sm" p="lg">
            <Skeleton height={20} width="70%" mb="md" />
            <Stack gap="xs">
              {[1, 2, 3, 4].map((_, idx) => (
                <Group key={idx} justify="space-between">
                  <Skeleton height={16} width="50%" />
                  <Skeleton height={16} width={60} />
                </Group>
              ))}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    );
  }

  if (!results) {
    return null;
  }

  // Find fastest team time to calculate deltas
  const fastestTime = Math.min(...results.teams.map((t) => t.totalTime));

  return (
    <>
      <Grid grow>
        {results.teams.map((team, teamIndex) => {
          const teamColorConfig = TEAM_COLORS[teamIndex] || TEAM_COLORS[0];
          const teamColor = {
            letter: teamColorConfig.letter,
            color: teamColorConfig.color,
            bg:
              colorScheme === "dark"
                ? teamColorConfig.bgDark
                : teamColorConfig.bgLight,
          };
          const delta = team.totalTime - fastestTime;
          const isFastest = delta === 0;

          return (
            <Grid.Col key={teamIndex} span={{ base: 12, md: 6, lg: 4 }}>
              <EqualRelayTeamCard
                teamNumber={teamIndex + 1}
                swimmers={team.swimmers}
                totalTime={team.totalTime}
                teamColor={teamColor}
                delta={delta}
                isFastest={isFastest}
              />
            </Grid.Col>
          );
        })}
      </Grid>

      <Card
        withBorder
        p="md"
        style={{
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(14, 165, 233, 0.1)"
              : "rgba(14, 165, 233, 0.05)",
          borderColor:
            colorScheme === "dark"
              ? "rgba(14, 165, 233, 0.3)"
              : "rgba(14, 165, 233, 0.2)",
        }}
      >
        <Group gap="sm" align="flex-start" wrap="nowrap">
          <IconInfoCircle
            style={{ width: rem(20), height: rem(20), flexShrink: 0 }}
            color="var(--mantine-color-blue-6)"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={600} c="blue.5" style={{ lineHeight: 1.4 }}>
              Poznámka k výpočtu
            </Text>
            <Text
              size="sm"
              c={colorScheme === "dark" ? "blue.3" : "blue.8"}
              mt={4}
              style={{ lineHeight: 1.5 }}
            >
              Časy byly použity z osobních rekordů plavců na 50m volný způsob na
              25metrovém bazéně. Vybrání plavců do týmů bylo optimalizováno tak,
              aby rozdíl mezi nejrychlejší a nejpomalejší štafetou byl co
              nejmenší. V případě nevyváženého počtu plavců je nejrychlejší
              plavec vybrán plavat dvakrát.
            </Text>
          </div>
        </Group>
      </Card>
    </>
  );
}
