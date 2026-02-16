import { API_BASE_URL } from "../../config";
import { apiGet, apiPost, apiPatch, apiDelete } from "./apiHelpers";
import type {
  Group,
  GroupDetail,
  CreateGroupRequest,
  UpdateGroupRequest,
  SwimmerInGroup,
} from "../schema/groups";

export const groupsApi = {
  async getAll(): Promise<Group[]> {
    return apiGet(`${API_BASE_URL}/api/admin/groups`);
  },

  async getDetail(groupId: number): Promise<GroupDetail> {
    return apiGet(`${API_BASE_URL}/api/admin/groups/${groupId}`);
  },

  async create(data: CreateGroupRequest): Promise<Group> {
    return apiPost(`${API_BASE_URL}/api/admin/groups`, data);
  },

  async update(groupId: number, data: UpdateGroupRequest): Promise<Group> {
    return apiPatch(`${API_BASE_URL}/api/admin/groups/${groupId}`, data);
  },

  async delete(groupId: number): Promise<void> {
    return apiDelete(`${API_BASE_URL}/api/admin/groups/${groupId}`);
  },

  async getSwimmers(groupId: number): Promise<SwimmerInGroup[]> {
    return apiGet(`${API_BASE_URL}/api/admin/groups/${groupId}/swimmers`);
  },

  async removeSwimmerGroup(groupId: number, swimmerId: number): Promise<void> {
    return apiDelete(
      `${API_BASE_URL}/api/admin/groups/${groupId}/swimmers/${swimmerId}`,
    );
  },
};
