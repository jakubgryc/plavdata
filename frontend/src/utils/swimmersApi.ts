import { authenticatedFetch } from "./authenticatedFetch";
import { API_BASE_URL } from "../../config";
import type {
  PaginatedSwimmersResponse,
  UpdateSwimmerRequest,
  Swimmer,
} from "../schema/swimmers";
import type { Group } from "../schema/groups";

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
  async getAll(
    params: GetSwimmersParams = {},
  ): Promise<PaginatedSwimmersResponse> {
    const { page = 1, pageSize = 50 } = params;

    const searchParams = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/admin/swimmers?${searchParams}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch swimmers");
    }

    return response.json();
  },

  async update(
    swimmerId: number,
    data: UpdateSwimmerRequest,
  ): Promise<Swimmer> {
    // Currently not used, will keep it if I decide to implement single swimmer editing (perhaps in the swimmers profile)
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/admin/swimmers/${swimmerId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to update swimmer");
    }

    return response.json();
  },

  async bulkUpdate(
    data: BulkUpdateSwimmersRequest,
  ): Promise<BulkUpdateSwimmersResponse> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/admin/swimmers/bulk`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to bulk update swimmers");
    }

    return response.json();
  },

  async getGroups(): Promise<Group[]> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/admin/groups`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch groups");
    }

    return response.json();
  },
};
