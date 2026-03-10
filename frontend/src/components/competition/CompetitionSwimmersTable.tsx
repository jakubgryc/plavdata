import { useState } from "react";
import {
  Paper,
  Title,
  Group,
  ThemeIcon,
  Table,
  ActionIcon,
  Collapse,
  Text,
  Badge,
  Stack,
  Pagination,
  TextInput,
} from "@mantine/core";
import {
  IconUsers,
  IconChevronDown,
  IconChevronUp,
  IconSearch,
} from "@tabler/icons-react";
import { parseTimeFromMillis } from "../../utils/timeUtils";
import { DNF_THRESHOLD } from "../../utils/constants";
import { getImprovementBadge } from "../shared/ImprovementBadge";
import { Link } from "react-router";
import type { CompetitionSwimmerResult } from "../../schema/types";

interface CompetitionSwimmersTableProps {
  swimmers: CompetitionSwimmerResult[];
}

const ITEMS_PER_PAGE = 15;


function CompetitionSwimmersTable({
  swimmers,
}: CompetitionSwimmersTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [activePage, setActivePage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = swimmers.filter((s) => {
    const fullName = `${s.name} ${s.surname}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const toggleRow = (swimmerId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(swimmerId)) {
        next.delete(swimmerId);
      } else {
        next.add(swimmerId);
      }
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
              {swimmers.length} plavců
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

      <Table.ScrollContainer minWidth={600}>
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Plavec</Table.Th>
              <Table.Th style={{ textAlign: "center" }}>Počet startů</Table.Th>
              <Table.Th style={{ textAlign: "center" }}>Osobní rekordy</Table.Th>
              <Table.Th w={50} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginated.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text ta="center" c="dimmed" py="xl">
                    Žádní plavci nenalezeni
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {paginated.map((swimmer) => {
              const isExpanded = expandedRows.has(swimmer.swimmerId);
              const pbCount = swimmer.results.filter(
                (r) => r.improvement && r.time < DNF_THRESHOLD,
              ).length;
              const currentYear = new Date().getFullYear();
              const age = currentYear - swimmer.birthYear;

              return (
                <>
                  <Table.Tr
                    key={swimmer.swimmerId}
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleRow(swimmer.swimmerId)}
                  >
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Stack gap={0}>
                          <Text
                            component={Link}
                            to={`/swimmer/${swimmer.swimmerId}`}
                            fw={600}
                            size="sm"
                            style={{ color: "inherit", textDecoration: "none" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {swimmer.surname} {swimmer.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Ročník {swimmer.birthYear} ({age} let)
                          </Text>
                        </Stack>
                      </Group>
                    </Table.Td>
                    <Table.Td style={{ textAlign: "center" }}>
                      <Badge variant="light" color="blue" size="sm">
                        {swimmer.results.length}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ textAlign: "center" }}>
                      {pbCount > 0 ? (
                        <Badge variant="light" color="green" size="sm">
                          {pbCount}
                        </Badge>
                      ) : (
                        <Text size="xs" c="dimmed">
                          –
                        </Text>
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
                        {isExpanded ? (
                          <IconChevronUp size={16} />
                        ) : (
                          <IconChevronDown size={16} />
                        )}
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>

                  {/* Expanded detail rows */}
                  <Table.Tr key={`${swimmer.swimmerId}-detail`}>
                    <Table.Td colSpan={4} p={0}>
                      <Collapse in={isExpanded}>
                        <Table
                          withTableBorder={false}
                          style={{
                            backgroundColor:
                              "var(--mantine-color-default-hover)",
                          }}
                          verticalSpacing="xs"
                        >
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Disciplína</Table.Th>
                              <Table.Th style={{ textAlign: "right" }}>
                                Čas
                              </Table.Th>
                              <Table.Th style={{ textAlign: "right" }}>
                                Body
                              </Table.Th>
                              <Table.Th style={{ textAlign: "right" }}>
                                Výkonnost
                              </Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {swimmer.results.map((result, idx) => (
                                <Table.Tr key={idx}>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <Text size="sm">{result.discipline}</Text>
                                            {result.relayPart && (
                                                <Badge
                                                    size="xs"
                                                    color="grape"
                                                    variant="outline"
                                                >
                                                    štafeta
                                                </Badge>
                                            )}
                                            {result.clubRecord && (
                                                <Badge
                                                    size="xs"
                                                    color="orange"
                                                    variant="outline"
                                                >
                                                    klubový rekord
                                                </Badge>
                                            )}
                                        </Group>
                                    </Table.Td>
                                <Table.Td style={{ textAlign: "right" }}>
                                  {result.time >= DNF_THRESHOLD ? (
                                    <Badge color="gray" variant="light" size="sm">
                                      DNF
                                    </Badge>
                                  ) : (
                                    <Text size="sm" ff="monospace" fw={500}>
                                      {parseTimeFromMillis(result.time)}
                                    </Text>
                                  )}
                                </Table.Td>
                                <Table.Td style={{ textAlign: "right" }}>
                                  {result.points != null ? (
                                    <Text size="sm" fw={600} c="blue">
                                      {result.points}
                                    </Text>
                                  ) : (
                                    <Text size="sm" c="dimmed">
                                      –
                                    </Text>
                                  )}
                                </Table.Td>
                                <Table.Td style={{ textAlign: "right" }}>
                                  {result.time >= DNF_THRESHOLD ? (
                                    <Badge color="gray" variant="light" size="sm">–</Badge>
                                  ) : (
                                    getImprovementBadge(result)
                                  )}
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </Collapse>
                    </Table.Td>
                  </Table.Tr>
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

      {filtered.length > 0 && (
        <Text size="xs" c="dimmed" ta="center" pb="sm">
          Zobrazeno {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} z{" "}
          {filtered.length} plavců
        </Text>
      )}
    </Paper>
  );
}

export default CompetitionSwimmersTable;

