import {
  ActionIcon,
  Badge,
  Group,
  Pagination,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconSearch, IconUsers } from "@tabler/icons-react";
import { Fragment, useState } from "react";
import { Link } from "react-router";
import type { CompetitionSwimmerResult } from "../../schema/types";
import { DNF_TRESHOLD } from "../../utils/constants";
import DropdownResults from "../shared/DropdownResults.tsx";

interface CompetitionSwimmersTableProps {
  swimmers: CompetitionSwimmerResult[];
}

const ITEMS_PER_PAGE = 15;

function CompetitionSwimmersTable({ swimmers }: CompetitionSwimmersTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [activePage, setActivePage] = useState(1);
  const [search, setSearch] = useState("");

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
        <Table highlightOnHover verticalSpacing="xs" className="responsive-results-table">
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
                <Fragment key={swimmer.swimmerId}>
                  <Table.Tr
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleRow(swimmer.swimmerId)}
                  >
                    <Table.Td fw={600}>
                      <Text
                        component={Link}
                        to={`/swimmer/${swimmer.swimmerId}`}
                        fw={600}
                        onClick={(e) => e.stopPropagation()}
                        className="swimmerLink"
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

                  {isExpanded ? (
                    <DropdownResults
                      id={swimmer.swimmerId}
                      results={swimmer.results}
                      isExpanded={isExpanded}
                    />
                  ) : null}
                </Fragment>
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
