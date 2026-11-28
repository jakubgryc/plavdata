export interface Swimmer {
  id: number;
  name: string;
  surname: string;
  birth_year: number;
  group_id: number | null;
  group_display_name: string | null;
  sex: string;
  membership_start: string | null;
  membership_end: string | null;
  is_active: boolean;
  show_in_comparison: boolean;
  show_in_personal_bests: boolean;
  show_in_relay_builder: boolean;
  yarmill_user_id: number | null;
}

export interface PaginatedSwimmersResponse {
  swimmers: Swimmer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SwimmerEdits {
  group_id?: number | null;
  show_in_comparison?: boolean;
  show_in_personal_bests?: boolean;
  show_in_relay_builder?: boolean;
  yarmill_user_id?: number | null;
}

export interface UpdateSwimmerRequest {
  group_id?: number | null;
  show_in_comparison?: boolean;
  show_in_personal_bests?: boolean;
  show_in_relay_builder?: boolean;
  /** Explicit null clears the mapping on the backend. */
  yarmill_user_id?: number | null;
}
