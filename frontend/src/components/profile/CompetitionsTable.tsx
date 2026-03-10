import {
  ActionIcon,
  Badge,
  Collapse,
  Group,
  Pagination,
  Paper,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { IconCalendarMonth, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router";
import type { SwimmerCompetition } from "../../schema/types";
import { parseTimeFromMillis } from "../../utils/timeUtils";
import { DNF_THRESHOLD } from "../../utils/constants";
import { getImprovementBadge } from "../shared/ImprovementBadge";

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
      <Group justify="space-between" p={{ base: "sm", sm: "lg" }} pb={{ base: "xs", sm: "md" }}>
        <Group gap="xs">
          <ThemeIcon variant="transparent" color="blue">
            <IconCalendarMonth />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Seznam závodů</Title>
            <Text size="xs" c="dimmed">
                {competitions.length === 1
                    ? "1 závod"
                    : competitions.length >= 2 && competitions.length <= 4
                        ? `${competitions.length} závody`
                        : `${competitions.length} závodů`}
            </Text>
          </Stack>
        </Group>
      </Group>

            <Table.ScrollContainer minWidth={480}>
                <Table
                    highlightOnHover
                    verticalSpacing="xs"
                    className="competitions-table"
                >
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th w="10%">Datum</Table.Th>
                            <Table.Th w="40%">Název závodu</Table.Th>
                            <Table.Th w="20%">Místo</Table.Th>
                            <Table.Th w="10%">Bazén</Table.Th>
                            <Table.Th w="10%" style={{textAlign: "right"}}>
                                Starty
                            </Table.Th>
                            <Table.Th w="10%"></Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {paginatedCompetitions.map((comp) => {
                            const isExpanded = expandedRows.has(comp.competitionId);
                            return (
                                <>
                                    <Table.Tr
                                        key={comp.competitionId}
                                        style={{cursor: "pointer"}}
                                        onClick={() => toggleRow(comp.competitionId)}
                                    >
                                        <Table.Td
                                            fw={500}
                                            style={{
                                                fontVariantNumeric: "tabular-nums",
                                                whiteSpace: "nowrap",
                                            }}
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
                                            <Text
                                                component={Link}
                                                to={`/competitions/${comp.competitionId}`}
                                                fw={600}
                                                style={{color: "inherit", textDecoration: "none"}}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {comp.name}
                                            </Text>
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
                                        <Table.Td style={{whiteSpace: "nowrap"}}>
                                            {comp.poolLength}m
                                        </Table.Td>
                                        <Table.Td style={{textAlign: "right"}}>
                                            <Badge variant="light" color="blue" size="sm">
                                                {comp.results.length}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <ActionIcon
                                                variant="subtle"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleRow(comp.competitionId);
                                                }}
                                            >
                                                {isExpanded ? (
                                                    <IconChevronUp size={16}/>
                                                ) : (
                                                    <IconChevronDown size={16}/>
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
                                                        verticalSpacing="xs"
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
                                                                return (
                                                                    <Table.Tr key={idx}>
                                                                        <Table.Td>
                                                                            <Text size="sm">{result.discipline}</Text>
                                                                        </Table.Td>
                                                                        <Table.Td ff="monospace">
                                                                            {result.time >= DNF_THRESHOLD ? (
                                                                                <Badge
                                                                                    color="gray"
                                                                                    variant="light"
                                                                                    size="sm"
                                                                                >
                                                                                    DNF
                                                                                </Badge>
                                                                            ) : (
                                                                                parseTimeFromMillis(result.time)
                                                                            )}
                                                                        </Table.Td>
                                                                        <Table.Td>
                                                                            {result.time >= DNF_THRESHOLD ? (
                                                                                <Badge
                                                                                    color="gray"
                                                                                    variant="light"
                                                                                    size="sm"
                                                                                >
                                                                                    –
                                                                                </Badge>
                                                                            ) : (
                                                                                getImprovementBadge(result)
                                                                            )}
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
          <Pagination total={totalPages} value={activePage} onChange={setActivePage} size="sm" />
        </Group>
      )}
    </Paper>
  );
}

export default CompetitionsTable;
