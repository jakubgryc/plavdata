import { authenticatedFetch } from "./authenticatedFetch";
import { API_BASE_URL } from "../../config";
import type {
  Group,
  GroupDetail,
  CreateGroupRequest,
  UpdateGroupRequest,
} from "../schema/groups";

export const groupsApi = {
  async getAll(): Promise<Group[]> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/admin/groups`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch groups");
    }

    return response.json();
  },

  async getDetail(groupId: number): Promise<GroupDetail> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/admin/groups/${groupId}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch group details");
    }

    return response.json();
  },

  async create(data: CreateGroupRequest): Promise<Group> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/admin/groups`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to create group");
    }

    return response.json();
  },

  async update(groupId: number, data: UpdateGroupRequest): Promise<Group> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/admin/groups/${groupId}`,
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
      throw new Error(error.detail || "Failed to update group");
    }

    return response.json();
  },

  async delete(groupId: number): Promise<void> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/admin/groups/${groupId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to delete group");
    }
  },
};
