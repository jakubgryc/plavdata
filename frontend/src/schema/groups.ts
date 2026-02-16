export interface Group {
  id: number;
  name: string;
  display_name_cs: string;
  swimmer_count: number;
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
}

export interface SwimmerInGroup {
  id: number;
  name: string;
  surname: string;
  birth_year: number;
  sex: string;
  membership_end: string | null;
}
