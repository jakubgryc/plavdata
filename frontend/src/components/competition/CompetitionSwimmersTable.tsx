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
  TextInput,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconSearch, IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router";
import type { CompetitionSwimmerResult } from "../../schema/types";
import { DNF_TRESHOLD, FIRST_TIME_TRESHOLD } from "../../utils/constants";
import { parseTimeFromMillis } from "../../utils/timeUtils";
import { getImprovementBadge } from "../shared/ImprovementBadge";

interface CompetitionSwimmersTableProps {
  swimmers: CompetitionSwimmerResult[];
}

const ITEMS_PER_PAGE = 15;

function CompetitionSwimmersTable({ swimmers }: CompetitionSwimmersTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [activePage, setActivePage] = useState(1);
  const [search, setSearch] = useState("");
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const filtered = swimmers.filter((s) =>
    `${s.name} ${s.surname}`.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const toggleRow = (swimmerId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(swimmerId)) next.delete(swimmerId);
      else next.add(swimmerId);
      return next;
    });
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setActivePage(1);
  };

  return (
    <Paper radius="lg" withBorder>
      <Group
        justify="space-between"
        p={{ base: "sm", sm: "lg" }}
        pb={{ base: "xs", sm: "md" }}
        wrap="wrap"
        gap="sm"
      >
        <Group gap="xs">
          <ThemeIcon variant="transparent" color="blue">
            <IconUsers />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Výsledky plavců</Title>
            <Text size="xs" c="dimmed">
              {swimmers.length === 1
                ? "1 plavec"
                : swimmers.length >= 2 && swimmers.length <= 4
                  ? `${swimmers.length} plavci`
                  : `${swimmers.length} plavců`}
            </Text>
          </Stack>
        </Group>
        <TextInput
          placeholder="Hledat plavce..."
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={(e) => handleSearch(e.currentTarget.value)}
          size="sm"
          w={{ base: "100%", xs: 220 }}
        />
      </Group>

      <Table.ScrollContainer minWidth={320}>
        <Table highlightOnHover verticalSpacing="xs" className="competitions-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w="34%"> Plavec</Table.Th>
              <Table.Th w="12%">Ročník</Table.Th>
              <Table.Th w="12%" style={{ textAlign: "center" }}>
                Starty
              </Table.Th>
              <Table.Th w="12%" style={{ textAlign: "center" }}>
                Osobní rekordy
              </Table.Th>
              <Table.Th w="10%" />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginated.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="xl">
                    Žádní plavci nenalezeni
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {paginated.map((swimmer) => {
              const isExpanded = expandedRows.has(swimmer.swimmerId);
              const pbCount = swimmer.results.filter(
                (r) => r.improvement && r.time < DNF_TRESHOLD,
              ).length;

              return (
                <>
                  <Table.Tr
                    key={swimmer.swimmerId}
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleRow(swimmer.swimmerId)}
                  >
                    <Table.Td fw={600}>
                      <Text
                        component={Link}
                        to={`/swimmer/${swimmer.swimmerId}`}
                        fw={600}
                        style={{ color: "inherit", textDecoration: "none" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {swimmer.surname} {swimmer.name}
                      </Text>
                    </Table.Td>
                    <Table.Td fw={500} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {swimmer.birthYear}
                    </Table.Td>
                    <Table.Td style={{ textAlign: "center" }}>
                      <Badge variant="light" color="blue">
                        {swimmer.results.length}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ textAlign: "center" }}>
                      {pbCount > 0 ? (
                        <Badge variant="light" color="green">
                          {pbCount}
                        </Badge>
                      ) : (
                        <Text c="dimmed">–</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(swimmer.swimmerId);
                        }}
                      >
                        {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>

                  {isExpanded && (
                    <Table.Tr key={`${swimmer.swimmerId}-detail`}>
                      <Table.Td colSpan={5} p={0}>
                        <Collapse in={isExpanded}>
                          <Table
                            withTableBorder={false}
                            style={{
                              backgroundColor: isDark
                                ? "var(--mantine-color-dark-6)"
                                : "var(--mantine-color-gray-0)",
                            }}
                            verticalSpacing="xs"
                          >
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Disciplína</Table.Th>
                                <Table.Th>Čas</Table.Th>
                                <Table.Th>Před. OR</Table.Th>
                                <Table.Th>Výkonnost</Table.Th>
                                <Table.Th>Body</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {swimmer.results.map((result) => {
                                const previousPB =
                                  result.comparisonToBest >= FIRST_TIME_TRESHOLD ||
                                  (result.comparisonToBest === 0 && !result.improvement)
                                    ? null
                                    : result.time + result.comparisonToBest;
                                return (
                                  <Table.Tr key={`${result.disciplineCode}-${result.time}`}>
                                    <Table.Td>
                                      <Group gap="xs">
                                        <Text>{result.disciplineCode}</Text>
                                        {result.relayPart && (
                                          <Badge size="xs" color="grape" variant="outline">
                                            štafeta
                                          </Badge>
                                        )}
                                        {result.clubRecord && (
                                          <Badge size="xs" color="orange" variant="outline">
                                            KR
                                          </Badge>
                                        )}
                                      </Group>
                                    </Table.Td>
                                    <Table.Td ff="monospace">
                                      {result.time >= DNF_TRESHOLD
                                        ? getImprovementBadge(result, {
                                            isDnf: true,
                                          })
                                        : parseTimeFromMillis(result.time)}
                                    </Table.Td>
                                    <Table.Td ff="monospace" c="dimmed">
                                      {previousPB != null ? parseTimeFromMillis(previousPB) : "–"}
                                    </Table.Td>
                                    <Table.Td ff="monospace">
                                      {getImprovementBadge(result, {
                                        isDnf: result.time >= DNF_TRESHOLD,
                                        isFirstTime:
                                          result.comparisonToBest >= FIRST_TIME_TRESHOLD &&
                                          !result.improvement,
                                      })}
                                    </Table.Td>
                                    <Table.Td>
                                      {result.points != null ? (
                                        <Text fw={500} c="blue">
                                          {result.points}
                                        </Text>
                                      ) : (
                                        <Text c="dimmed">–</Text>
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

      {filtered.length > 0 && (
        <Text size="xs" c="dimmed" ta="center" pb="sm">
          Zobrazeno {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} z {filtered.length}{" "}
          plavců
        </Text>
      )}
    </Paper>
  );
}

export default CompetitionSwimmersTable;
