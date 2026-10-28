export interface SeasonOut {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

export interface ScheduleSlot {
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface ContextGroup {
  id: number;
  display_name_cs: string;
  schedule: ScheduleSlot[];
}

export interface AttendanceContext {
  season: SeasonOut | null;
  groups: ContextGroup[];
}

export interface SwimmerBrief {
  id: number;
  name: string;
  surname: string;
}

export interface AttendanceEntry {
  swimmer_id: number;
  present: boolean;
}

export interface TrainingOut {
  total_meters: number | null;
  drill_meters: number | null;
  kick_meters: number | null;
  description: string | null;
  duration_minutes: number | null;
  saved_by_name: string;
  saved_at: string;
  attendance: AttendanceEntry[];
}

export interface DayOut {
  date: string;
  is_training_day: boolean;
  schedule: ScheduleSlot | null;
  swimmers: SwimmerBrief[];
  training: TrainingOut | null;
}

export interface SaveDayBody {
  group_id: number;
  date: string;
  attendance: AttendanceEntry[];
  total_meters: number | null;
  drill_meters: number | null;
  kick_meters: number | null;
  description: string | null;
  duration_minutes: number | null;
}

export interface WeekDayOut {
  date: string;
  is_training_day: boolean;
  schedule: ScheduleSlot | null;
  filled: boolean;
  present_count: number | null;
  saved_by_name: string | null;
  saved_at: string | null;
  attendance: AttendanceEntry[];
}

export interface WeekOut {
  swimmers: SwimmerBrief[];
  days: WeekDayOut[];
}

export interface ImportSource {
  group_id: number;
  display_name_cs: string;
}
