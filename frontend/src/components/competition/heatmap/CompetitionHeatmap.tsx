import { Box } from "@mantine/core";
import type { CompetitionSwimmerResult } from "../../../schema/types";
import HeatmapGrid from "./HeatmapGrid";
import HeatmapLegend from "./HeatmapLegend";

interface CompetitionHeatmapProps {
  swimmers: CompetitionSwimmerResult[];
}

function CompetitionHeatmap({ swimmers }: CompetitionHeatmapProps) {
  return (
    <Box>
      <HeatmapLegend />
      <HeatmapGrid swimmers={swimmers} />
    </Box>
  );
}

export default CompetitionHeatmap;
