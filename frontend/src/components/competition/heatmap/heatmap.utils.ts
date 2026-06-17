import type { CompetitionSwimmerResult } from "../../../schema/types";
import { DNF_TRESHOLD } from "../../../utils/constants";
import type { CellData } from "./heatmap.constants";

export const generateHeatmapLookup = (swimmers: CompetitionSwimmerResult[]) => {
  const lookup = new Map<number, Map<string, CellData>>();
  for (const swimmer of swimmers) {
    const dmap = new Map<string, CellData>();
    for (const result of swimmer.results) {
      if (result.relayPart) continue;
      const isDnf = result.time >= DNF_TRESHOLD;
      dmap.set(result.disciplineCode, {
        state: isDnf ? "dnf" : result.improvement ? "pb" : "swam",
        result,
      });
    }
    lookup.set(swimmer.swimmerId, dmap);
  }
  return lookup;
};
