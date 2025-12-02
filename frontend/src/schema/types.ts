export interface BaseSwimmer {
  id: number;
  name: string;
  surname: string;
}

export interface GroupedSwimmers {
  group: string;
  swimmers: BaseSwimmer[];
}

export interface Swimmer {
  name: string;
  surname: string;
  birth_year: number;
  current_age?: number;
  group: string;
  gender: string;
}

export interface SwimmerWithID extends Swimmer {
  id: number;
}

export interface Discipline {
  title: string;
  code: string;
}

export interface Course {
  type: string;
  length: number;
}

interface BasePersonalBest {
  swimmer: Swimmer;
  discipline: Discipline;
  course: Course;
  age_at_pb?: number;
  time: number; // Time in milliseconds
  points: number;
  split_time?: boolean;
  relay_part?: boolean;
  competition_location?: string;
  date?: string; // ISO date string
}

export interface PersonalBest extends BasePersonalBest {
  swimmer: Swimmer;
}

interface Result {
  discipline: Discipline;
  course: Course;
  time: number;
  comparison_to_best: number;
  split_time?: boolean;
  relay_part?: boolean;
  improvement?: boolean;
  competition_location?: string;
  date: string; // ISO date string
}

export interface SwimmerPersonalBest {
  swimmer: SwimmerWithID;
  personal_bests: BasePersonalBest[];
}

export interface SwimmerResults {
  swimmer: SwimmerWithID;
  results: Result[];
}
