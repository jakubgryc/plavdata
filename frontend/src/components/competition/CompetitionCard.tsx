import { Badge, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCalendarEvent, IconChevronRight, IconMapPin } from "@tabler/icons-react";
import { Link } from "react-router";
import type { CompetitionListItem } from "../../schema/types";
import { formatDate } from "../../utils/timeUtils";

function CompetitionCard({ comp }: { comp: CompetitionListItem }) {
  const startDate = formatDate(comp.startDate);
  const endDate = formatDate(comp.endDate);
  const isSingleDay = comp.startDate === comp.endDate;
  const dateLabel = isSingleDay ? startDate : `${startDate} – ${endDate}`;

  return (
    <Paper
      component={Link}
      to={`/competitions/${comp.id}`}
      p="md"
      radius="md"
      withBorder
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        transition: "border-color 0.15s ease",
      }}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm" style={{ lineHeight: 1.3 }}>
            {comp.title}
          </Text>
          <Group gap="sm" wrap="wrap">
            <Group gap={4}>
              <IconCalendarEvent size={13} style={{ opacity: 0.5 }} />
              <Text size="xs" c="dimmed">
                {dateLabel}
              </Text>
            </Group>
            {comp.location && (
              <Group gap={4}>
                <IconMapPin size={13} style={{ opacity: 0.5 }} />
                <Text size="xs" c="dimmed" style={{ maxWidth: 200 }} truncate>
                  {comp.location}
                </Text>
              </Group>
            )}
            {comp.poolLength && (
              <Badge size="xs" variant="outline" color="gray">
                {comp.poolLength}m
              </Badge>
            )}
          </Group>
        </Stack>
        <ThemeIcon variant="subtle" color="gray" size="sm">
          <IconChevronRight size={16} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

export default CompetitionCard;
