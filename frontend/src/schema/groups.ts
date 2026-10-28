export interface Group {
  id: number;
  name: string;
  display_name_cs: string;
  display_order: number;
  swimmer_count: number;
  yarmill_group_id: number | null;
  is_morning_group: boolean;
}

/** A group that has at least one swimmer visible in the personal bests view. */
export interface PBGroup {
  id: number;
  display_name_cs: string;
}

export interface GroupDetail extends Group {
  active_swimmer_count: number;
}

export interface CreateGroupRequest {
  name: string;
  display_name_cs: string;
}

export interface UpdateGroupRequest {
  name?: string;
  display_name_cs?: string;
  /** Explicit null clears the mapping on the backend. */
  yarmill_group_id?: number | null;
  is_morning_group?: boolean;
}

export interface SwimmerInGroup {
  id: number;
  name: string;
  surname: string;
  birth_year: number;
  sex: string;
  membership_end: string | null;
}
