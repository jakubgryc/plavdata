import {
  Button,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconCalendar,
  IconCalendarEvent,
  IconExternalLink,
  IconFlame,
  IconSwimming,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react";
import type { SwimmerBasicInfo, SwimmerStats } from "../../schema/types";
import { ACTIVE_GROUPS } from "../../utils/constants.ts";
import { getGroupLabel } from "../../utils/profileUtils";

interface ProfileHeaderProps {
  basicInfo: SwimmerBasicInfo;
  stats: SwimmerStats;
}

function ProfileHeader({ basicInfo, stats }: ProfileHeaderProps) {
  const { colorScheme } = useMantineColorScheme();
  const currentYear = new Date().getFullYear();
  const age = currentYear - basicInfo.birthYear;

  const statCards = [
    {
      icon: IconSwimming,
      color: "blue",
      label: "Starty",
      value: stats.totalStarts,
      subtitle: `${stats.yearStarts} tento rok`,
      secondaryLabel: "celkem",
    },
    {
      icon: IconCalendarEvent,
      color: "teal",
      label: "Závody",
      value: stats.totalCompetitions,
      subtitle: `${stats.yearCompetitions} tento rok`,
      secondaryLabel: "celkem",
    },
    {
      icon: IconFlame,
      color: "violet",
      label: "Osobní rekordy",
      value: stats.yearPersonalBests,
      secondaryLabel: "tento rok",
    },
    ...(stats.clubRecords > 0
      ? [
          {
            icon: IconTrophy,
            color: "yellow" as const,
            label: "Klubové rekordy",
            value: stats.clubRecords,
          },
        ]
      : []),
  ];

  return (
    <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Group gap="sm">
            <Title
              order={1}
              className="card-header-title"
            >{`${basicInfo.name} ${basicInfo.surname}`}</Title>
          </Group>
          {basicInfo.cspsId && (
            <Button
              component="a"
              href={`https://vysledky.czechswimming.cz/lide/${basicInfo.cspsId}`}
              target="_blank"
              rel="noopener noreferrer"
              leftSection={<IconExternalLink size={16} />}
              variant="default"
              size="sm"
            >
              ČSPS Profil
            </Button>
          )}
        </Group>

        <Group gap="xl" wrap="wrap">
          <Group gap="xs">
            <IconCalendar size={16} stroke={1.5} />
            <Text size="sm" c="dimmed" className="profile-info-text">
              Ročník: <strong>{basicInfo.birthYear}</strong> ({age} let)
            </Text>
          </Group>
          {ACTIVE_GROUPS.includes(basicInfo.group) && (
            <Group gap="xs">
              <IconUsers size={16} stroke={1.5} />
              <Text size="sm" c="dimmed" className="profile-info-text">
                Skupina: <strong>{getGroupLabel(basicInfo.group)}</strong>
              </Text>
            </Group>
          )}
        </Group>

        <Stack
          gap="md"
          mt="xs"
          pt="md"
          style={{
            borderTop: `1px solid ${colorScheme === "dark" ? "#373A40" : "#dee2e6"}`,
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
                    {stat.secondaryLabel && (
                      <Text size="sm" c="dimmed">
                        {stat.secondaryLabel}
                      </Text>
                    )}
                  </Group>
                  {stat.subtitle && (
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

export default ProfileHeader;
