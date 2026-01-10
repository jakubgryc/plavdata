import {
  Card,
  Stack,
  Group,
  Grid,
  Skeleton,
  useMantineColorScheme,
} from "@mantine/core";
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

  // Count total swimmers who swim twice
  let totalSwimmersTwice = 0;
  let swimmerWhoSwimsTwice: string | null = null;

  results.teams.forEach((team) => {
    const swimmerCounts = new Map<number, number>();
    team.swimmers.forEach((swimmer) => {
      swimmerCounts.set(swimmer.id, (swimmerCounts.get(swimmer.id) || 0) + 1);
    });
    swimmerCounts.forEach((count, swimmerId) => {
      if (count > 1) {
        totalSwimmersTwice++;
        const swimmer = team.swimmers.find((s) => s.id === swimmerId);
        if (swimmer && !swimmerWhoSwimsTwice) {
          swimmerWhoSwimsTwice = `${swimmer.surname} ${swimmer.name}`;
        }
      }
    });
  });

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
    </>
  );
}
