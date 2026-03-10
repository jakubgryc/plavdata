import { Stack, SimpleGrid, Center, ThemeIcon, Text, Divider, Skeleton } from "@mantine/core";
import { IconSwimming } from "@tabler/icons-react";
import CompetitionCard from "./CompetitionCard";
import type { CompetitionListItem } from "../../schema/types";

const MONTHS_CS = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

interface CompetitionListProps {
  competitions: CompetitionListItem[];
  loading: boolean;
}

function CompetitionList({ competitions, loading }: CompetitionListProps) {
  if (loading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} height={72} radius="md" />
        ))}
      </SimpleGrid>
    );
  }

  if (competitions.length === 0) {
    return (
      <Center h="20vh">
        <Stack align="center" gap="xs">
          <ThemeIcon variant="light" color="gray" size="xl" radius="xl">
            <IconSwimming size={24} />
          </ThemeIcon>
          <Text c="dimmed">Žádné závody nenalezeny</Text>
        </Stack>
      </Center>
    );
  }

  // Group by month (0-based), descending
  const byMonth = new Map<number, CompetitionListItem[]>();
  for (const comp of competitions) {
    const month = new Date(comp.startDate).getMonth();
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(comp);
  }
  const sortedMonths = [...byMonth.keys()].sort((a, b) => b - a);

  return (
    <Stack gap="xl">
      {sortedMonths.map((month) => (
        <Stack key={month} gap="sm">
          <Divider
            label={
              <Text size="sm" fw={600} c="dimmed">
                {MONTHS_CS[month]}
              </Text>
            }
            labelPosition="left"
          />
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
            {byMonth.get(month)!.map((comp) => (
              <CompetitionCard key={comp.id} comp={comp} />
            ))}
          </SimpleGrid>
        </Stack>
      ))}
    </Stack>
  );
}

export default CompetitionList;

