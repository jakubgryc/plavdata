import {
  Center,
  Flex,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Table,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconGenderFemale,
  IconGenderMale,
  IconSelector,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { API_BASE_URL } from "../../config";

interface RecordHolder {
  swimmerId: number;
  name: string;
  surname: string;
  sex: "male" | "female";
  recordCount: number;
  recordCount25: number;
  recordCount50: number;
}

type RankedHolder = RecordHolder & { rank: number };

// Competition ranking: equal counts share a rank, the next one skips
function withRanks(holders: RecordHolder[]): RankedHolder[] {
  const ranked: RankedHolder[] = [];
  holders.forEach((holder, index) => {
    const prev = ranked[index - 1];
    ranked.push({
      ...holder,
      rank: prev && prev.recordCount === holder.recordCount ? prev.rank : index + 1,
    });
  });
  return ranked;
}

type SortKey = "rank" | "surname" | "recordCount" | "recordCount25" | "recordCount50";
type SortState = { key: SortKey; direction: "asc" | "desc" };

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? IconSelector : sort.direction === "asc" ? IconChevronUp : IconChevronDown;

  return (
    <Table.Th
      ta={align}
      style={{ cursor: "pointer", userSelect: "none" }}
      onClick={() => onSort(sortKey)}
    >
      <Group gap={4} wrap="nowrap" justify={align === "right" ? "flex-end" : "flex-start"}>
        {label}
        <Icon size={14} opacity={active ? 1 : 0.35} />
      </Group>
    </Table.Th>
  );
}

interface HoldersTableProps {
  title: string;
  icon: typeof IconGenderFemale;
  iconColor: string;
  holders: RankedHolder[];
  isFetching: boolean;
}

function HoldersTable({ title, icon: Icon, iconColor, holders, isFetching }: HoldersTableProps) {
  const [sort, setSort] = useState<SortState>({ key: "recordCount", direction: "desc" });

  const handleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "surname" ? "asc" : "desc" },
    );

  const sortedHolders = useMemo(() => {
    const mult = sort.direction === "asc" ? 1 : -1;
    return [...holders].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * mult;
      }
      return String(av).localeCompare(String(bv), "cs") * mult;
    });
  }, [holders, sort]);

  return (
    <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
      <Group gap="xs" mb="md">
        <ThemeIcon variant="transparent" color={iconColor}>
          <Icon />
        </ThemeIcon>
        <Title order={4}>{title}</Title>
      </Group>

      {isFetching ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : holders.length === 0 ? (
        <Center h={200}>
          <Text c="dimmed">Žádní držitelé rekordů.</Text>
        </Center>
      ) : (
        <Table striped highlightOnHover className="responsive-results-table">
          <Table.Thead>
            <Table.Tr>
              <SortableTh label="#" sortKey="rank" sort={sort} onSort={handleSort} />
              <SortableTh label="Plavec" sortKey="surname" sort={sort} onSort={handleSort} />
              <SortableTh
                label="Celkem"
                sortKey="recordCount"
                sort={sort}
                onSort={handleSort}
                align="right"
              />
              <SortableTh
                label="25 m"
                sortKey="recordCount25"
                sort={sort}
                onSort={handleSort}
                align="right"
              />
              <SortableTh
                label="50 m"
                sortKey="recordCount50"
                sort={sort}
                onSort={handleSort}
                align="right"
              />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedHolders.map((holder) => (
              <Table.Tr key={holder.swimmerId}>
                <Table.Td c="dimmed">{holder.rank}.</Table.Td>
                <Table.Td>
                  <Text
                    className="textHoverLink"
                    component={Link}
                    to={`/swimmer/${holder.swimmerId}`}
                    fw={500}
                    size="sm"
                  >
                    {holder.surname} {holder.name}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text fw={700} size="sm">
                    {holder.recordCount}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text size="sm" c={holder.recordCount25 > 0 ? undefined : "dimmed"}>
                    {holder.recordCount25 > 0 ? holder.recordCount25 : "–"}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text size="sm" c={holder.recordCount50 > 0 ? undefined : "dimmed"}>
                    {holder.recordCount50 > 0 ? holder.recordCount50 : "–"}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Paper>
  );
}

function RecordHolders() {
  const [holders, setHolders] = useState<RecordHolder[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchHolders = async () => {
      setIsFetching(true);
      try {
        const response = await fetch(`${API_BASE_URL}/results/record-holders`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          console.error("Failed to fetch record holders:", response.status);
          setHolders([]);
          return;
        }
        setHolders((await response.json()) as RecordHolder[]);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Error fetching record holders:", error);
        setHolders([]);
      } finally {
        setIsFetching(false);
      }
    };

    void fetchHolders();
    return () => controller.abort();
  }, []);

  const women = useMemo(() => withRanks(holders.filter((h) => h.sex === "female")), [holders]);
  const men = useMemo(() => withRanks(holders.filter((h) => h.sex === "male")), [holders]);

  return (
    <Flex direction="column" gap="md">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" style={{ alignItems: "start" }}>
        <HoldersTable
          title="Ženy"
          icon={IconGenderFemale}
          iconColor="pink"
          holders={women}
          isFetching={isFetching}
        />
        <HoldersTable
          title="Muži"
          icon={IconGenderMale}
          iconColor="blue"
          holders={men}
          isFetching={isFetching}
        />
      </SimpleGrid>
    </Flex>
  );
}

export default RecordHolders;
