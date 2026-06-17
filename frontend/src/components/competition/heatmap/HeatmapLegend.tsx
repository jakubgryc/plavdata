import { Box, Group, Text, useMantineTheme } from "@mantine/core";
import { CELL_COLORS, CELL_LABELS, type CellState } from "./heatmap.constants";

function CompetitionLegend() {
  const theme = useMantineTheme();

  const cellStates: CellState[] = ["pb", "swam", "dnf", "none"];
  return (
    <Group gap="lg" mb="lg" wrap="wrap">
      {cellStates.map((state) => (
        <Group gap={6} key={state}>
          <Box
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              backgroundColor: CELL_COLORS[state],
              border: state === "none" ? `1px solid ${theme.colors.dark[4]}` : undefined,
              flexShrink: 0,
            }}
          />
          <Text size="xs" c="dimmed">
            {CELL_LABELS[state]}
          </Text>
        </Group>
      ))}
    </Group>
  );
}

export default CompetitionLegend;
