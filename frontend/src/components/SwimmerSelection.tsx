import { MultiSelect, Stack, Group, Text } from "@mantine/core";
import type { GroupedSwimmers } from "../schema/types";

interface SwimmerSelectionProps {
  groupedSwimmers: GroupedSwimmers[];
  selectedSwimmers: string[];
  onSwimmersChange: (swimmers: string[]) => void;
}

export function SwimmerSelection({
  groupedSwimmers,
  selectedSwimmers,
  onSwimmersChange,
}: SwimmerSelectionProps) {
  return (
    <Stack gap="xs">
      <Text
        size="xs"
        tt="uppercase"
        fw={500}
        c="dimmed"
        style={{ letterSpacing: "0.5px" }}
      >
        Výběr plavců
      </Text>
      <MultiSelect
        data={groupedSwimmers.map(({ group, swimmers }) => ({
          group: group === "veteran" ? "bývalí" : group,
          items: swimmers.map(
            (swimmer) => `${swimmer.surname} ${swimmer.name}`,
          ),
        }))}
        value={selectedSwimmers}
        onChange={onSwimmersChange}
        placeholder="Vyhledat plavce..."
        clearable
        searchable
      />
      <Group justify="space-between" wrap="wrap">
        <Text size="xs" c="dimmed">
          Vybráno {selectedSwimmers.length} plavců
        </Text>
        <Group gap="xs">
          {groupedSwimmers.map((group) => (
            <Text
              key={group.group}
              size="xs"
              c="blue"
              style={{ cursor: "pointer" }}
              onClick={() => {
                const groupSwimmerNames = group.swimmers.map(
                  (swimmer) => `${swimmer.surname} ${swimmer.name}`,
                );
                const newSelection = Array.from(
                  new Set([...selectedSwimmers, ...groupSwimmerNames]),
                );
                onSwimmersChange(newSelection);
              }}
            >
              {group.group === "veteran"
                ? "Vybrat všechny bývalé"
                : `Vybrat celou ${group.group}`}
            </Text>
          ))}
        </Group>
      </Group>
    </Stack>
  );
}
