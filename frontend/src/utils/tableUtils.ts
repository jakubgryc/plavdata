import type { SwimmerPersonalBest } from "../schema/types.ts";
import { DISCIPLINES } from "./constants.ts";
import { parseTimeFromMillis } from "./timeUtils.ts";

type TableRow = Record<string, string>;

export function buildTableData(data: SwimmerPersonalBest[]): TableRow[] {
  return data.map((swimmerBests) => {
    const row: TableRow = {
      name: `${swimmerBests.swimmer.surname} ${swimmerBests.swimmer.name}`,
    };
    for (const discipline of DISCIPLINES) {
      const pb = swimmerBests.personal_bests.find(
        (p) => p.discipline?.code === discipline,
      );
      row[discipline] = pb ? parseTimeFromMillis(pb.time) : "";
    }
    return row;
  });
}
