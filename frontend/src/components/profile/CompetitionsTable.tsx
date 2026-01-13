import { Paper, Title, Group, ThemeIcon, Button, Table } from "@mantine/core";
import { IconCalendarMonth } from "@tabler/icons-react";
import type { SwimmerCompetition } from "../../schema/types";

interface CompetitionsTableProps {
  competitions: SwimmerCompetition[];
}

function CompetitionsTable({ competitions }: CompetitionsTableProps) {
  const recentCompetitions = competitions.slice(0, 4);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <Paper radius="lg" withBorder>
      <Group
        justify="space-between"
        p={{ base: "sm", sm: "lg" }}
        pb={{ base: "xs", sm: "md" }}
      >
        <Group gap="xs">
          <ThemeIcon variant="transparent" color="blue">
            <IconCalendarMonth />
          </ThemeIcon>
          <Title order={3}>Poslední závody</Title>
        </Group>
        <Button variant="subtle" size="sm">
          Všechny závody
        </Button>
      </Group>

      <Table.ScrollContainer minWidth={700}>
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Datum</Table.Th>
              <Table.Th>Název závodu</Table.Th>
              <Table.Th>Místo</Table.Th>
              <Table.Th>Bazén</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Počet startů</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {recentCompetitions.map((comp) => (
              <Table.Tr key={comp.competitionId}>
                <Table.Td fw={500}>{formatDate(comp.date)}</Table.Td>
                <Table.Td fw={600}>{comp.name}</Table.Td>
                <Table.Td>{comp.location}</Table.Td>
                <Table.Td>{comp.poolLength}m</Table.Td>
                <Table.Td style={{ textAlign: "right" }}>
                  <span
                    style={{
                      backgroundColor: "rgba(14, 165, 233, 0.1)",
                      color: "#0ea5e9",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                    }}
                  >
                    {comp.starts}
                  </span>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}

export default CompetitionsTable;
