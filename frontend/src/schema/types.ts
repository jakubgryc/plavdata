export interface BaseSwimmer {
  id: number;
  name: string;
  surname: string;
}

export interface GroupedSwimmers {
  group: string;
  swimmers: BaseSwimmer[];
}

// Dashboard Stats Types
export interface YearlyStatValue {
  current: number;
  previous?: number;
}

export interface DashboardStats {
  totalStarts: YearlyStatValue;
  totalMeets: YearlyStatValue;
  clubRecords: YearlyStatValue;
  personalBests: YearlyStatValue;
}

export interface TopSwimmer {
  rank: number;
  swimmerId: number;
  name: string;
  surname: string;
  discipline: string;
  points: number;
  time: number;
}

export interface RecentClubRecord {
  resultId: number;
  name: string;
  surname: string;
  discipline: string;
  time: number;
  date: string;
  ageCategories: string[];
}

export interface DashboardResponse {
  currentYear: number;
  previousYear: number;
  currentPeriod: string;
  previousPeriod: string;
  stats: DashboardStats;
  topMen: TopSwimmer[];
  topWomen: TopSwimmer[];
  recentRecords: RecentClubRecord[];
  oldestRecords: RecentClubRecord[];
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

// Relay Types
export interface RelaySwimmer {
  id: number;
  name: string;
  surname: string;
  stroke?: string; // Optional - only used for medley relays
  time: number;
}

export interface RelayResult {
  totalTime: number;
  swimmers: RelaySwimmer[];
}

export interface EqualRelayTeam {
  swimmers: RelaySwimmer[];
  totalTime: number;
}

export interface EqualRelayResult {
  teams: EqualRelayTeam[];
  delta: number;
  swimmersPerRelay: number;
}
