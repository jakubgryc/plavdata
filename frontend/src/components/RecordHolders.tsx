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
import { IconGenderFemale, IconGenderMale } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { API_BASE_URL } from "../../config";

interface RecordHolder {
  swimmerId: number;
  name: string;
  surname: string;
  sex: "male" | "female";
  recordCount: number;
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

interface HoldersTableProps {
  title: string;
  icon: typeof IconGenderFemale;
  iconColor: string;
  holders: RankedHolder[];
  isFetching: boolean;
}

function HoldersTable({ title, icon: Icon, iconColor, holders, isFetching }: HoldersTableProps) {
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
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={50}>#</Table.Th>
              <Table.Th>Plavec</Table.Th>
              <Table.Th ta="right">Rekordů</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {holders.map((holder) => (
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
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Paper>
  );
}

interface RecordHoldersProps {
  course: string;
}

function RecordHolders({ course }: RecordHoldersProps) {
  const [holders, setHolders] = useState<RecordHolder[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchHolders = async () => {
      setIsFetching(true);
      try {
        const response = await fetch(`${API_BASE_URL}/results/record-holders?course=${course}`, {
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
  }, [course]);

  const women = useMemo(
    () => withRanks(holders.filter((h) => h.sex === "female")),
    [holders],
  );
  const men = useMemo(() => withRanks(holders.filter((h) => h.sex === "male")), [holders]);

  return (
    <Flex direction="column" gap="md">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
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
