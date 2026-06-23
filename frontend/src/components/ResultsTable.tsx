import { Center, Flex, Loader, Paper, Space, Table, Text, Tooltip } from "@mantine/core";
import { Link } from "react-router";
import type { SwimResultRow } from "../pages/results";
import { formatDate, parseTimeFromMillis } from "../utils/timeUtils.ts";

interface ResultsTableProps {
  results: SwimResultRow[];
  loading: boolean;
  page: number;
}

function ResultsTable({ results, loading, page }: ResultsTableProps) {
  const perPage = results.length;
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
    <Paper radius="md" withBorder>
      <Table.ScrollContainer minWidth={500}>
        <Table
          verticalSpacing="xs"
          highlightOnHover
          tabularNums
          striped
          className="responsive-results-table"
        >
          <Table.Thead>
            <Table.Tr c="blue">
              <Table.Th w="5%">#</Table.Th>
              <Table.Th w="30%">Jméno</Table.Th>
              <Table.Th w="8%">Ročník</Table.Th>
              <Table.Th w="8%">Čas</Table.Th>
              <Table.Th w="8%">Body</Table.Th>
              <Table.Th w="8%">Bazén</Table.Th>
              <Table.Th w="13%">Datum</Table.Th>
              <Table.Th w="13%">Místo</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {results.map((row, index) => (
              <Table.Tr key={row.resultId}>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {index + 1 + (page - 1) * perPage}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text
                    component={Link}
                    to={`/swimmer/${row.swimmerId}`}
                    style={{ textDecoration: "none", fontWeight: 500 }}
                    className="textHoverLink"
                  >
                    {row.swimmerSurname} {row.swimmerName}
                  </Text>
                </Table.Td>
                <Table.Td>{row.birthYear}</Table.Td>
                <Table.Td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                  <Flex align="center">
                    {parseTimeFromMillis(row.time)}
                    <Space w="sm" />
                    {row.splitTime && (
                      <Tooltip label="Mezičas" withArrow>
                        <Text size="xs" c="green" variant="light">
                          M
                        </Text>
                      </Tooltip>
                    )}
                    {row.relayPart && (
                      <Tooltip label="Štafeta" withArrow>
                        <Text size="xs" c="pink" variant="light">
                          Š
                        </Text>
                      </Tooltip>
                    )}
                  </Flex>
                </Table.Td>
                <Table.Td>{row.points}</Table.Td>
                <Table.Td>{row.poolLength}m</Table.Td>
                <Table.Td>{formatDate(row.date)}</Table.Td>
                <Table.Td
                  style={{
                    maxWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.location}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}

export default ResultsTable;
