import { Box, Group, Paper, ThemeIcon, Title } from "@mantine/core";
import { IconLayoutGrid } from "@tabler/icons-react";
import type { CompetitionSwimmerResult } from "../../schema/types";
import HeatmapGrid from "./heatmap/HeatmapGrid.tsx";
import HeatmapLegend from "./heatmap/HeatmapLegend.tsx";

interface CompetitionDisciplineStatsProps {
  swimmers: CompetitionSwimmerResult[];
}

function CompetitionDisciplineStats({ swimmers }: CompetitionDisciplineStatsProps) {
  return (
    <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
      <Group gap="xs" mb={{ base: "xs", sm: "md" }}>
        <ThemeIcon variant="transparent" color="blue">
          <IconLayoutGrid />
        </ThemeIcon>
        <Title order={3}>Rozložení startů</Title>
      </Group>
      <Box>
        <HeatmapLegend />
        <HeatmapGrid swimmers={swimmers} />
      </Box>
    </Paper>
  );
}

export default CompetitionDisciplineStats;
