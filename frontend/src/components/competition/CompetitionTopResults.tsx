import { Badge, Group, Paper, Table, Text, ThemeIcon, Title } from "@mantine/core";
import { IconFlame } from "@tabler/icons-react";
import { Link } from "react-router";
import type { CompetitionSwimmerResult } from "../../schema/types";
import { DNF_TRESHOLD, FIRST_TIME_TRESHOLD } from "../../utils/constants";
import { parseTimeFromMillis } from "../../utils/timeUtils";

interface CompetitionTopResultsProps {
  swimmers: CompetitionSwimmerResult[];
}

interface TopEntry {
  swimmerId: number;
  name: string;
  surname: string;
  discipline: string;
  time: number;
  performance: number;
  comparisonToBest: number;
}

function getTopResults(swimmers: CompetitionSwimmerResult[], count = 10): TopEntry[] {
  const entries: TopEntry[] = [];
  for (const swimmer of swimmers) {
    for (const result of swimmer.results) {
      if (
        result.relayPart ||
        result.time >= DNF_TRESHOLD ||
        !result.improvement ||
        result.comparisonToBest >= FIRST_TIME_TRESHOLD
      )
        continue;
      entries.push({
        swimmerId: swimmer.swimmerId,
        name: swimmer.name,
        surname: swimmer.surname,
        discipline: result.discipline,
        time: result.time,
        performance: result.performance,
        comparisonToBest: result.comparisonToBest,
      });
    }
  }
  return entries.sort((a, b) => b.performance - a.performance).slice(0, count);
}

function CompetitionTopResults({ swimmers }: CompetitionTopResultsProps) {
  const entries = getTopResults(swimmers);

  // previousPB = time + abs(comparisonToBest)
  // comparisonToBest is negative when improved (current time is lower)
  const getPreviousPB = (time: number, comparisonToBest: number) =>
    time + Math.abs(comparisonToBest);

  return (
    <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
      <Group gap="xs" mb={{ base: "xs", sm: "md" }}>
        <ThemeIcon variant="transparent" color="green">
          <IconFlame />
        </ThemeIcon>
        <Title order={3}>Největší zlepšení závodu</Title>
      </Group>

      <Table.ScrollContainer minWidth={480}>
        <Table highlightOnHover verticalSpacing="xs" className="responsive-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={32}>#</Table.Th>
              <Table.Th>Plavec</Table.Th>
              <Table.Th>Disciplína</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Čas</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Předchozí OR</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Zlepšení</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {entries.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center">
                    Žádná zlepšení
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {entries.map((entry, idx) => {
              const previousPB = getPreviousPB(entry.time, entry.comparisonToBest);
              const pct = (entry.performance * 100).toFixed(2);
              return (
                <Table.Tr key={`${entry.swimmerId}-${entry.discipline}`}>
                  <Table.Td>
                    <Text c={idx === 0 ? "green" : "dimmed"} fw={700} size="sm">
                      {idx + 1}.
                    </Text>
                  </Table.Td>
                  <Table.Td fw={600}>
                    <Text
                      component={Link}
                      to={`/swimmer/${entry.swimmerId}`}
                      fw={600}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {entry.surname} {entry.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>{entry.discipline}</Table.Td>
                  <Table.Td style={{ textAlign: "right", fontFamily: "monospace" }}>
                    {parseTimeFromMillis(entry.time)}
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right", fontFamily: "monospace" }} c="dimmed">
                    {parseTimeFromMillis(previousPB)}
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Badge color="green" variant="light" size="sm">
                      +{pct}%
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}

export default CompetitionTopResults;
