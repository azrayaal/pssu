import { apiClient } from '@/lib/api-client';
import type { AuditLog, Company, Paginated, QueryParams, RecordStatus, Role, User } from '@/types';
import type { UserFormValues } from '@/schemas/user.schema';
import type { RoleFormValues } from '@/schemas/role.schema';
import type { CompanyFormValues } from '@/schemas/company.schema';

export interface UserSummary {
  total: number;
  active: number;
  inactive: number;
  departments: number;
}

export interface UserDetail {
  user: User;
  role: Role | undefined;
  activity: AuditLog[];
}

export const administrationService = {
  listUsers: (params: QueryParams) => apiClient.get<Paginated<User>>('/users', { params }),
  userSummary: () => apiClient.get<UserSummary>('/users/summary'),
  getUser: (id: string) => apiClient.get<UserDetail>(`/users/${id}`),
  createUser: (payload: UserFormValues) => apiClient.post<User>('/users', payload),
  updateUser: (id: string, payload: UserFormValues) => apiClient.put<User>(`/users/${id}`, payload),
  setUserStatus: (id: string, status: RecordStatus) =>
    apiClient.patch<User>(`/users/${id}/status`, { status }),
  deleteUser: (id: string) => apiClient.delete<{ success: boolean }>(`/users/${id}`),

  listRoles: () => apiClient.get<Role[]>('/roles'),
  getRole: (id: string) => apiClient.get<Role>(`/roles/${id}`),
  createRole: (payload: RoleFormValues) => apiClient.post<Role>('/roles', payload),
  updateRole: (id: string, payload: Partial<Role>) => apiClient.put<Role>(`/roles/${id}`, payload),
  deleteRole: (id: string) => apiClient.delete<{ success: boolean }>(`/roles/${id}`),

  listAuditLogs: (params: QueryParams) => apiClient.get<Paginated<AuditLog>>('/audit-logs', { params }),

  getCompany: () => apiClient.get<Company>('/company'),
  listCompanies: () => apiClient.get<Company[]>('/companies'),
  updateCompany: (payload: CompanyFormValues) => apiClient.put<Company>('/company', payload),
  switchCompany: (companyId: string) => apiClient.post<Company>('/company/switch', { companyId }),
  me: () => apiClient.get<User>('/me'),
};
