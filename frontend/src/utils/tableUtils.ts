import type { SwimmerPersonalBest } from "../schema/types.ts";
import { DISCIPLINES } from "./constants.ts";
import { parseTimeFromMillis } from "./timeUtils.ts";

type DisciplineDescription = {
  time: string;
  date: string | undefined;
  isSplit: boolean | undefined;
  isRelayPart: boolean | undefined;
  location: string | undefined;
  points: number | undefined;
};

type TableRow = Record<string, string | number | DisciplineDescription>;

export function buildTableData(data: SwimmerPersonalBest[]): TableRow[] {
  const emptyDescription: DisciplineDescription = {
    time: "",
    date: "",
    isSplit: false,
    isRelayPart: false,
    location: "",
    points: undefined,
  };
  return data.map((swimmerBests) => {
    const row: TableRow = {
      name: `${swimmerBests.swimmer.surname} ${swimmerBests.swimmer.name}`,
      swimmerId: swimmerBests.swimmer.id,
    };
    for (const discipline of DISCIPLINES) {
      const pb = swimmerBests.personal_bests.find(
        (p) => p.discipline?.code === discipline,
      );
      let pbDescription: DisciplineDescription = emptyDescription;
      if (pb) {
        pbDescription = {
          time: parseTimeFromMillis(pb.time),
          date: pb.date,
          isSplit: pb.split_time,
          isRelayPart: pb.relay_part,
          location: pb.competition_location,
          points: pb.points,
        };
      }

      row[discipline] = pbDescription;
    }
    return row;
  });
}
