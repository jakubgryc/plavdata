import { Center, Loader, Table, Text } from "@mantine/core";
import { Link } from "react-router";
import type { SwimResultRow } from "../pages/results";

interface ResultsTableProps {
  results: SwimResultRow[];
  loading: boolean;
}

function ResultsTable({ results, loading }: ResultsTableProps) {
  if (loading) {
    return (
      <Center my="xl">
        <Loader size="md" variant="circular" />
      </Center>
    );
  }

  if (results.length === 0) {
    return (
      <Center my="xl">
        <Text c="dimmed">Pro zadaná kritéria nebyly nalezeny žádné výsledky.</Text>
      </Center>
    );
  }

  return (
    <Table.ScrollContainer minWidth={600}>
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Jméno</Table.Th>
            <Table.Th>Ročník</Table.Th>
            <Table.Th>Čas</Table.Th>
            <Table.Th>FINA body</Table.Th>
            <Table.Th>Bazén</Table.Th>
            <Table.Th>Místo / Závod</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {results.map((row) => (
            <Table.Tr key={row.id}>
              <Table.Td>
                {/* Dynamically links to the existing swimmer profile component path */}
                <Text
                  component={Link}
                  to={`/swimmer/${row.swimmer_id}`}
                  color="blue"
                  style={{ textDecoration: "none", fontWeight: 500 }}
                >
                  {row.swimmer_name}
                </Text>
              </Table.Td>
              <Table.Td>{row.birth_year}</Table.Td>
              <Table.Td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                {row.time_formatted}
              </Table.Td>
              <Table.Td>{row.fina_points}</Table.Td>
              <Table.Td>{row.pool_length}m</Table.Td>
              <Table.Td>
                <Text size="sm">{row.competition_name}</Text>
                <Text size="xs" c="dimmed">
                  {row.location} ({new Date(row.date).toLocaleDateString("cs-CZ")})
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export default ResultsTable;
