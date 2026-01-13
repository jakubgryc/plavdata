import {
  Paper,
  Group,
  Stack,
  Title,
  Badge,
  Button,
  Text,
  SimpleGrid,
  ThemeIcon,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconCalendar,
  IconUsers,
  IconSwimming,
  IconCalendarEvent,
  IconFlame,
  IconTrophy,
  IconExternalLink,
} from "@tabler/icons-react";
import { getGroupLabel } from "../../utils/profileUtils";
import { ACTIVE_GROUPS } from "../../utils/constants.ts";
import type { SwimmerBasicInfo, SwimmerStats } from "../../schema/types";

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
      value: stats.totalStarts,
      label: "Startů",
    },
    {
      icon: IconCalendarEvent,
      color: "teal",
      value: stats.totalCompetitions,
      label: "Závodů",
    },
    {
      icon: IconFlame,
      color: "violet",
      value: stats.yearPersonalBests,
      label: "OR",
    },
    {
      icon: IconTrophy,
      color: "yellow",
      value: stats.clubRecords,
      label: "Klubových rekordů",
    },
  ];

  return (
    <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
      <Group align="flex-start" wrap="nowrap" mb={{ base: "sm", sm: "lg" }}>
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Group gap="sm">
              <Title
                order={1}
                className="profile-header-title"
              >{`${basicInfo.name} ${basicInfo.surname}`}</Title>
              <Badge color="blue" size="lg" variant="light">
                Aktivní plavec
              </Badge>
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

          <SimpleGrid
            cols={{ base: 2, sm: 4 }}
            spacing={{ base: "xs", sm: "md" }}
            mt={{ base: "xs", sm: "md" }}
            pt={{ base: "xs", sm: "md" }}
            style={{
              borderTop: `1px solid ${
                colorScheme === "dark" ? "#373A40" : "#dee2e6"
              }`,
            }}
          >
            {statCards.map((stat) => (
              <Group key={stat.label} gap="xs" wrap="nowrap">
                <ThemeIcon size="lg" variant="light" color={stat.color}>
                  <stat.icon size={20} />
                </ThemeIcon>
                <div>
                  <Text
                    size="xl"
                    fw={700}
                    lh={1}
                    className="profile-stat-value"
                  >
                    {stat.value}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    {stat.label}
                  </Text>
                </div>
              </Group>
            ))}
          </SimpleGrid>
        </Stack>
      </Group>
    </Paper>
  );
}

export default ProfileHeader;
