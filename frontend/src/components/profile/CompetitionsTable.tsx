import { useState } from "react";
import {
  Paper,
  Title,
  Group,
  ThemeIcon,
  Table,
  Pagination,
  ActionIcon,
  Collapse,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconCalendarMonth,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { parseTimeFromMillis } from "../../utils/timeUtils";
import type { SwimmerCompetition } from "../../schema/types";

interface CompetitionsTableProps {
  competitions: SwimmerCompetition[];
}

const ITEMS_PER_PAGE = 8;

function CompetitionsTable({ competitions }: CompetitionsTableProps) {
  const [activePage, setActivePage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const totalPages = Math.ceil(competitions.length / ITEMS_PER_PAGE);
  const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCompetitions = competitions.slice(startIndex, endIndex);

  const toggleRow = (compId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(compId)) {
        newSet.delete(compId);
      } else {
        newSet.add(compId);
      }
      return newSet;
    });
  };

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
          <Title order={3}>Seznam závodů</Title>
        </Group>
      </Group>

      <Table.ScrollContainer minWidth={700}>
        <Table
          highlightOnHover
          verticalSpacing="sm"
          className="competitions-table"
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={120}>Datum</Table.Th>
              <Table.Th w="35%">Název závodu</Table.Th>
              <Table.Th w="25%">Místo</Table.Th>
              <Table.Th w={80}>Bazén</Table.Th>
              <Table.Th w={100} style={{ textAlign: "right" }}>
                Počet startů
              </Table.Th>
              <Table.Th w={50}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedCompetitions.map((comp) => {
              const isExpanded = expandedRows.has(comp.competitionId);
              return (
                <>
                  <Table.Tr key={comp.competitionId}>
                    <Table.Td
                      fw={500}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatDate(comp.date)}
                    </Table.Td>
                    <Table.Td
                      fw={600}
                      style={{
                        maxWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {comp.name}
                    </Table.Td>
                    <Table.Td
                      style={{
                        maxWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {comp.location}
                    </Table.Td>
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
                        {comp.results.length}
                      </span>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={() => toggleRow(comp.competitionId)}
                      >
                        {isExpanded ? (
                          <IconChevronUp size={16} />
                        ) : (
                          <IconChevronDown size={16} />
                        )}
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                  {isExpanded && (
                    <Table.Tr>
                      <Table.Td colSpan={6} p={0}>
                        <Collapse in={isExpanded}>
                          <Table
                            style={{
                              backgroundColor: isDark
                                ? "var(--mantine-color-dark-6)"
                                : "var(--mantine-color-gray-0)",
                            }}
                            withTableBorder={false}
                          >
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Disciplína</Table.Th>
                                <Table.Th>Čas</Table.Th>
                                <Table.Th>Výkonnost</Table.Th>
                                <Table.Th>Body</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {comp.results.map((result, idx) => {
                                const performancePercent = (
                                  result.performance * 100
                                ).toFixed(2);
                                const isImprovement = result.improvement;
                                const performanceColor = isImprovement
                                  ? "green"
                                  : "red";

                                return (
                                  <Table.Tr key={idx}>
                                    <Table.Td>
                                      <Text size="sm">{result.discipline}</Text>
                                    </Table.Td>
                                    <Table.Td ff="monospace">
                                      {parseTimeFromMillis(result.time)}
                                    </Table.Td>
                                    <Table.Td>
                                      <Text
                                        size="sm"
                                        fw={500}
                                        c={performanceColor}
                                      >
                                        {isImprovement ? "+" : "-"}
                                        {performancePercent}%
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      {result.points ? (
                                        <Text size="sm" fw={500} c="blue">
                                          {result.points}
                                        </Text>
                                      ) : (
                                        <Text size="sm" c="dimmed">
                                          -
                                        </Text>
                                      )}
                                    </Table.Td>
                                  </Table.Tr>
                                );
                              })}
                            </Table.Tbody>
                          </Table>
                        </Collapse>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {totalPages > 1 && (
        <Group justify="center" p="md">
          <Pagination
            total={totalPages}
            value={activePage}
            onChange={setActivePage}
            size="sm"
          />
        </Group>
      )}
    </Paper>
  );
}

export default CompetitionsTable;
