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
  swimmerId: number;
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
  swimmerId: number;
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

// Swimmer Profile Types
export interface SwimmerBasicInfo {
  id: number;
  name: string;
  surname: string;
  birthYear: number;
  group: string;
  sex: string;
  cspsId: number;
}

export interface SwimmerSearchResult {
  id: number;
  name: string;
  surname: string;
  group?: string;
  birthYear: number;
}

export interface SwimmerStats {
  totalStarts: number;
  yearStarts: number;
  totalCompetitions: number;
  yearCompetitions: number;
  yearPersonalBests: number;
  clubRecords: number;
}

export interface SwimmerTopResult {
  discipline: string;
  time: number;
  points: number;
  date: string;
}

export interface SwimmerStartsByYear {
  year: number;
  starts: number;
}

export interface CompetitionResult {
  discipline: string;
  code: string;
  time: number;
  points: number | null;
  improvement: boolean;
  performance: number;
}

export interface SwimmerCompetition {
  competitionId: number;
  name: string;
  date: string;
  location: string;
  poolLength: number;
  results: CompetitionResult[];
}

export interface SwimmerPersonalBestRecord {
  discipline: string;
  code: string;
  time: number;
  points: number;
  date: string;
  location: string;
  splitTime: boolean;
  relayPart: boolean;
}

export interface SwimmerPersonalBests {
  pb25M: SwimmerPersonalBestRecord[];
  pb50M: SwimmerPersonalBestRecord[];
}

// Competition Detail Types
export interface CompetitionListItem {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  location: string | null;
  poolLength: number | null;
  cspsCompetitionId: number;
  hasResults: boolean;
}

export interface CompetitionInfo {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  location: string | null;
  poolLength: number | null;
  stopwatchType: string | null;
  resultsFileName: string | null;
  cspsCompetitionId: number;
}

export interface CompetitionResultDetail {
  discipline: string;
  disciplineCode: string;
  time: number;
  points: number | null;
  improvement: boolean;
  performance: number;
  relayPart: boolean;
  clubRecord: boolean;
}

export interface CompetitionSwimmerResult {
  swimmerId: number;
  name: string;
  surname: string;
  birthYear: number;
  results: CompetitionResultDetail[];
}

export interface CompetitionDetailResponse {
  competition: CompetitionInfo;
  swimmers: CompetitionSwimmerResult[];
  totalStarts: number;
  totalPersonalBests: number;
  clubRecordsCount: number;
}

export interface StartsByStroke {
  z: number;
  p: number;
  m: number;
  k: number;
  o: number;
}

export interface QuarterlyImprovement {
  quarter: string;
  year: number;
  quarterNum: number;
  totalStarts: number;
  improvements: number;
  improvementRate: number;
}

export interface SwimmerProfileResponse {
  basicInfo: SwimmerBasicInfo;
  stats: SwimmerStats;
  topResults: SwimmerTopResult[];
  startsByYear: SwimmerStartsByYear[];
  competitions: SwimmerCompetition[];
  personalBests: SwimmerPersonalBests;
  startsByStroke: StartsByStroke;
  quarterlyImprovements: QuarterlyImprovement[];
}
