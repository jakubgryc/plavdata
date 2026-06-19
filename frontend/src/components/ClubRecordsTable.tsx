import { Anchor, Badge, Box, Group, Paper, Table, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowRight, IconMedal } from "@tabler/icons-react";
import { Link } from "react-router";
import type { RecentClubRecord } from "../schema/types";
import { getAgeCategoryLabel } from "../utils/constants";
import { formatDate, parseTimeFromMillis } from "../utils/timeUtils";

interface ClubRecordsTableProps {
  records: RecentClubRecord[];
  title: string;
  subtitle: string;
  variant: "recent" | "oldest";
}

function ClubRecordsTable({ records, title, subtitle, variant }: ClubRecordsTableProps) {
  const color = variant === "recent" ? "green" : "orange";
  const iconColor = variant === "recent" ? "yellow" : "orange";

  return (
    <Paper p="lg" radius="md" withBorder shadow="sm" mb="xl">
      <Group justify="space-between" mb="lg">
        <Box>
          <Group gap="xs" mb={4}>
            <ThemeIcon size="sm" variant="transparent" color={iconColor}>
              <IconMedal size={18} />
            </ThemeIcon>
            <Title order={4}>{title}</Title>
          </Group>
          <Text size="sm" c="dimmed">
            {subtitle}
          </Text>
        </Box>
        <Anchor href="/club-records" size="sm" fw={500}>
          <Group gap={4}>
            Všechny rekordy
            <IconArrowRight size={14} />
          </Group>
        </Anchor>
      </Group>

      <Table.ScrollContainer minWidth={600}>
        <Table striped highlightOnHover className="responsive-results-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Disciplína</Table.Th>
              <Table.Th>Plavec</Table.Th>
              <Table.Th>Kategorie</Table.Th>
              <Table.Th>Bazén</Table.Th>
              <Table.Th>Čas</Table.Th>
              <Table.Th>Datum</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {records.map((record) => (
              <Table.Tr key={record.resultId}>
                <Table.Td fw={500}>{record.discipline}</Table.Td>
                <Table.Td>
                  <Text
                    className="textHoverLink"
                    component={Link}
                    to={`/swimmer/${record.swimmerId}`}
                    fw={500}
                  >
                    {record.surname} {record.name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {record.ageCategories.map((cat) => (
                      <Badge key={cat} size="xs" variant="light">
                        {getAgeCategoryLabel(cat)}
                      </Badge>
                    ))}
                  </Group>
                </Table.Td>
                <Table.Td>{record.poolLength} m</Table.Td>
                <Table.Td>
                  <Text c={color} fw={700}>
                    {parseTimeFromMillis(record.time)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text c="dimmed">{formatDate(record.date)}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}

export default ClubRecordsTable;
