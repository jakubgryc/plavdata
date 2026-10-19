export interface Season {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

export interface SeasonForm {
  name: string;
  start_date: string;
  end_date: string;
}

export interface AttendanceGroup {
  id: number;
  name: string;
  display_name_cs: string;
}

export interface GroupMember {
  id: number;
  name: string;
  surname: string;
  birth_year: number;
}

export interface ScheduleSlotForm {
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface GroupCoach {
  id: number;
  username: string;
  is_active: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface ResetPasswordResponse {
  password: string;
}
