import { API_BASE_URL } from "../../config";
import type { Group } from "../schema/groups";
import type { PaginatedSwimmersResponse, Swimmer, UpdateSwimmerRequest } from "../schema/swimmers";
import { apiGet, apiPatch } from "./apiHelpers";

export interface GetSwimmersParams {
  page?: number;
  pageSize?: number;
}

export interface SwimmerUpdateItem {
  swimmer_id: number;
  updates: UpdateSwimmerRequest;
}

export interface BulkUpdateSwimmersRequest {
  updates: SwimmerUpdateItem[];
}

export interface BulkUpdateSwimmersResponse {
  success_count: number;
  error_count: number;
  updated_swimmers: Swimmer[];
  errors: Array<{ swimmer_id: number; error: string }>;
}

export const swimmersApi = {
  async getAll(params: GetSwimmersParams = {}): Promise<PaginatedSwimmersResponse> {
    const { page = 1, pageSize = 50 } = params;

    const searchParams = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    return apiGet(`${API_BASE_URL}/admin/swimmers?${searchParams}`);
  },

  async update(swimmerId: number, data: UpdateSwimmerRequest): Promise<Swimmer> {
    // Currently not used, will keep it if I decide to implement single swimmer editing (perhaps in the swimmers profile)
    return apiPatch(`${API_BASE_URL}/admin/swimmers/${swimmerId}`, data);
  },

  async bulkUpdate(data: BulkUpdateSwimmersRequest): Promise<BulkUpdateSwimmersResponse> {
    return apiPatch(`${API_BASE_URL}/admin/swimmers/bulk`, data);
  },

  async getGroups(): Promise<Group[]> {
    return apiGet(`${API_BASE_URL}/admin/groups`);
  },
};
