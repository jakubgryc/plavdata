import { Badge, Collapse, Group, Table, Text, useMantineColorScheme } from "@mantine/core";
import type { CompetitionResultDetail } from "../../schema/types.ts";
import { DNF_TRESHOLD, FIRST_TIME_TRESHOLD } from "../../utils/constants";
import { parseTimeFromMillis } from "../../utils/timeUtils.ts";
import { getImprovementBadge } from "./ImprovementBadge.tsx";

interface DropdownResultsProps {
  id: number;
  results: CompetitionResultDetail[];
  isExpanded: boolean;
}

function DropdownResults({ id, results, isExpanded }: DropdownResultsProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <Table.Tr key={id}>
      <Table.Td colSpan={6} p={0}>
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
              {results.map((result) => {
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
                          result.comparisonToBest >= FIRST_TIME_TRESHOLD && !result.improvement,
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
  );
}

export default DropdownResults;
