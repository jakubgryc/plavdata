import type { SwimmerPersonalBest } from "../schema/types.ts";
import { DISCIPLINES } from "./constants.ts";
import { parseTimeFromMillis } from "./timeUtils.ts";

export type DisciplineDescription = {
  time: string;
  date: string | undefined;
  isSplit: boolean | undefined;
  isRelayPart: boolean | undefined;
  location: string | undefined;
  points: number | undefined;
};

export type PersonalBestRow = {
  name: string;
  swimmerId: number;
  [discipline: string]: DisciplineDescription | string | number;
};

export function buildTableData(data: SwimmerPersonalBest[]): PersonalBestRow[] {
  const emptyDescription: DisciplineDescription = {
    time: "",
    date: "",
    isSplit: false,
    isRelayPart: false,
    location: "",
    points: undefined,
  };
  return data.map((swimmerBests) => {
    const row: PersonalBestRow = {
      name: `${swimmerBests.swimmer.surname} ${swimmerBests.swimmer.name}`,
      swimmerId: swimmerBests.swimmer.id,
    };
    for (const discipline of DISCIPLINES) {
      const pb = swimmerBests.personal_bests.find((p) => p.discipline?.code === discipline);
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
