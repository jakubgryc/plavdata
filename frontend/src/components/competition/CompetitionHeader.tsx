import {
  Paper,
  Group,
  Stack,
  Title,
  Text,
  Button,
  Grid,
  ThemeIcon,
  Badge,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconCalendar,
  IconMapPin,
  IconSwimming,
  IconTrophy,
  IconFlame,
  IconExternalLink,
  IconChartBar,
} from "@tabler/icons-react";
import { formatDate } from "../../utils/timeUtils";
import type { CompetitionInfo } from "../../schema/types";

interface CompetitionHeaderProps {
  competition: CompetitionInfo;
  totalStarts: number;
  totalPersonalBests: number;
  clubRecordsCount: number;
}

function CompetitionHeader({
  competition,
  totalStarts,
  totalPersonalBests,
  clubRecordsCount,
}: CompetitionHeaderProps) {
  const { colorScheme } = useMantineColorScheme();

  const startDate = formatDate(competition.startDate);
  const endDate = formatDate(competition.endDate);
  const isSingleDay = competition.startDate === competition.endDate;
  const dateLabel = isSingleDay ? startDate : `${startDate} – ${endDate}`;

  const pbRate =
    totalStarts > 0
      ? Math.round((totalPersonalBests / totalStarts) * 100)
      : 0;

  const cspsResultsUrl = `https://vysledky.czechswimming.cz/souteze/${competition.cspsCompetitionId}`;

  const statCards = [
    {
      icon: IconSwimming,
      color: "blue",
      label: "Celkem startů",
      value: totalStarts,
    },
    {
      icon: IconFlame,
      color: "green",
      label: "Osobní rekordy",
      value: `${pbRate} %`,
      subtitle: `${totalPersonalBests} z ${totalStarts} startů`,
    },
    ...(clubRecordsCount > 0
      ? [
          {
            icon: IconTrophy,
            color: "yellow" as const,
            label: "Klubové rekordy",
            value: clubRecordsCount,
          },
        ]
      : []),
  ];

  return (
    <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
      <Stack gap="md">
        {/* Title row */}
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Title order={1} className="card-header-title">
            {competition.title}
          </Title>
          <Button
            component="a"
            href={cspsResultsUrl}
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconExternalLink size={16} />}
            variant="default"
            size="sm"
          >
            Oficiální výsledky
          </Button>
        </Group>

        {/* Meta info row */}
        <Group gap="xl" wrap="wrap">
          <Group gap="xs">
            <IconCalendar size={16} stroke={1.5} />
            <Text size="sm" c="dimmed">
              {dateLabel}
            </Text>
          </Group>
          {competition.location && (
            <Group gap="xs">
              <IconMapPin size={16} stroke={1.5} />
              <Text size="sm" c="dimmed">
                {competition.location}
              </Text>
            </Group>
          )}
          {competition.poolLength && (
            <Group gap="xs">
              <IconChartBar size={16} stroke={1.5} />
              <Text size="sm" c="dimmed">
                Bazén: {competition.poolLength}m
              </Text>
            </Group>
          )}
          {competition.stopwatchType && (
            <Badge variant="light" color="gray" size="sm">
              {competition.stopwatchType}
            </Badge>
          )}
        </Group>

        {/* Stats row */}
        <Stack
          gap="md"
          mt="xs"
          pt="md"
          style={{
            borderTop: `1px solid ${
              colorScheme === "dark" ? "#373A40" : "#dee2e6"
            }`,
          }}
        >
          <Grid grow>
            {statCards.map((stat) => (
              <Grid.Col span="auto" key={stat.label}>
                <Stack gap={4} align="center" style={{ minWidth: 120 }}>
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color={stat.color}>
                      <stat.icon size={16} />
                    </ThemeIcon>
                    <Text
                      size="xs"
                      c="dimmed"
                      tt="uppercase"
                      fw={600}
                      className="profile-stat-label"
                    >
                      {stat.label}
                    </Text>
                  </Group>
                  <Group gap="xs" align="baseline">
                    <Text size="xl" fw={700} className="profile-stat-value">
                      {stat.value}
                    </Text>
                  </Group>
                  {"subtitle" in stat && stat.subtitle && (
                    <Text size="xs" c="dimmed">
                      {stat.subtitle}
                    </Text>
                  )}
                </Stack>
              </Grid.Col>
            ))}
          </Grid>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default CompetitionHeader;
