import type { Company, PermissionMatrix, Role, User } from '@/types';
import { ApiError } from '@/lib/api-error';
import { initialsOf } from '@/utils/format';
import { matchesSearch, paginate, readString, sortRecords, withinRange } from '../query';
import { route, type Route } from '../router';

export const administrationRoutes: Route[] = [
  route('GET', '/users', ({ db, query }) => {
    const search = readString(query, 'search');
    const status = readString(query, 'status');
    const roleId = readString(query, 'roleId');
    const department = readString(query, 'department');

    const filtered = db.users.filter((user) => {
      if (status && user.status !== status) return false;
      if (roleId && user.roleId !== roleId) return false;
      if (department && user.department !== department) return false;
      return matchesSearch(search, [user.name, user.email, user.jobTitle, user.department, user.roleName]);
    });

    const sorted = sortRecords(
      filtered,
      readString(query, 'sortBy') ?? 'name',
      (readString(query, 'sortDir') as 'asc' | 'desc') ?? 'asc',
      (user, field) => (user as unknown as Record<string, string | number | null>)[field] ?? user.name,
    );
    return paginate(sorted, query);
  }),

  route('GET', '/users/summary', ({ db }) => ({
    total: db.users.length,
    active: db.users.filter((user) => user.status === 'Active').length,
    inactive: db.users.filter((user) => user.status === 'Inactive').length,
    departments: [...new Set(db.users.map((user) => user.department))].length,
  })),

  route('GET', '/users/:id', ({ db, params }) => {
    const user = db.users.find((entry) => entry.id === params.id);
    if (!user) throw new ApiError(404, 'Pengguna tidak ditemukan');
    const role = db.roles.find((entry) => entry.id === user.roleId);
    const activity = db.auditLogs.filter((log) => log.userId === user.id).slice(0, 20);
    return { user, role, activity };
  }),

  route('POST', '/users', ({ db, body }) => {
    const payload = body as Partial<User> & { roleId: string };
    if (db.users.some((user) => user.email.toLowerCase() === (payload.email ?? '').toLowerCase())) {
      throw new ApiError(422, 'Alamat email sudah terdaftar', 'DUPLICATE_EMAIL', {
        email: ['Alamat email sudah digunakan oleh pengguna lain'],
      });
    }
    const role = db.roles.find((entry) => entry.id === payload.roleId);
    if (!role) throw new ApiError(422, 'Peran wajib dipilih', 'ROLE_REQUIRED');
    const created: User = {
      id: `usr-new-${db.users.length + 1}`,
      name: payload.name ?? '',
      email: payload.email ?? '',
      phone: payload.phone ?? '',
      roleId: role.id,
      roleName: role.name,
      department: payload.department ?? '',
      jobTitle: payload.jobTitle ?? '',
      status: payload.status ?? 'Active',
      lastLoginAt: null,
      initials: initialsOf(payload.name ?? 'NA'),
      createdAt: new Date().toISOString(),
      createdBy: db.currentUser.name,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.users.unshift(created);
    role.userCount += 1;
    return created;
  }),

  route('PUT', '/users/:id', ({ db, params, body }) => {
    const index = db.users.findIndex((entry) => entry.id === params.id);
    if (index === -1) throw new ApiError(404, 'Pengguna tidak ditemukan');
    const payload = body as Partial<User>;
    const role = payload.roleId ? db.roles.find((entry) => entry.id === payload.roleId) : undefined;
    const updated: User = {
      ...db.users[index]!,
      ...payload,
      roleId: role?.id ?? db.users[index]!.roleId,
      roleName: role?.name ?? db.users[index]!.roleName,
      initials: initialsOf(payload.name ?? db.users[index]!.name),
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.users[index] = updated;
    return updated;
  }),

  route('PATCH', '/users/:id/status', ({ db, params, body }) => {
    const user = db.users.find((entry) => entry.id === params.id);
    if (!user) throw new ApiError(404, 'Pengguna tidak ditemukan');
    if (user.id === db.currentUser.id) {
      throw new ApiError(422, 'Anda tidak dapat menonaktifkan akun sendiri', 'SELF_DEACTIVATION');
    }
    user.status = (body as { status: 'Active' | 'Inactive' }).status;
    return user;
  }),

  route('DELETE', '/users/:id', ({ db, params }) => {
    if (params.id === db.currentUser.id) {
      throw new ApiError(422, 'Anda tidak dapat menghapus akun sendiri', 'SELF_DELETION');
    }
    db.users = db.users.filter((entry) => entry.id !== params.id);
    return { success: true };
  }),

  route('GET', '/roles', ({ db }) => db.roles),

  route('GET', '/roles/:id', ({ db, params }) => {
    const role = db.roles.find((entry) => entry.id === params.id);
    if (!role) throw new ApiError(404, 'Peran tidak ditemukan');
    return role;
  }),

  route('POST', '/roles', ({ db, body }) => {
    const payload = body as Partial<Role> & { permissions: PermissionMatrix };
    const created: Role = {
      id: `role-new-${db.roles.length + 1}`,
      name: payload.name ?? '',
      description: payload.description ?? '',
      userCount: 0,
      isSystem: false,
      permissions: payload.permissions,
      createdAt: new Date().toISOString(),
      createdBy: db.currentUser.name,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.roles.push(created);
    return created;
  }),

  route('PUT', '/roles/:id', ({ db, params, body }) => {
    const index = db.roles.findIndex((entry) => entry.id === params.id);
    if (index === -1) throw new ApiError(404, 'Peran tidak ditemukan');
    const updated: Role = {
      ...db.roles[index]!,
      ...(body as Partial<Role>),
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.roles[index] = updated;
    return updated;
  }),

  route('DELETE', '/roles/:id', ({ db, params }) => {
    const role = db.roles.find((entry) => entry.id === params.id);
    if (!role) throw new ApiError(404, 'Peran tidak ditemukan');
    if (role.isSystem) throw new ApiError(422, 'Peran sistem tidak dapat dihapus', 'SYSTEM_ROLE');
    if (db.users.some((user) => user.roleId === role.id)) {
      throw new ApiError(422, 'Peran masih digunakan oleh pengguna aktif', 'ROLE_IN_USE');
    }
    db.roles = db.roles.filter((entry) => entry.id !== role.id);
    return { success: true };
  }),

  route('GET', '/audit-logs', ({ db, query }) => {
    const search = readString(query, 'search');
    const action = readString(query, 'action');
    const module = readString(query, 'module');
    const userId = readString(query, 'userId');
    const from = readString(query, 'from');
    const to = readString(query, 'to');

    const filtered = db.auditLogs.filter((log) => {
      if (action && log.action !== action) return false;
      if (module && log.module !== module) return false;
      if (userId && log.userId !== userId) return false;
      if (!withinRange(log.timestamp.slice(0, 10), from, to)) return false;
      return matchesSearch(search, [
        log.userName,
        log.action,
        log.module,
        log.reference,
        log.description,
        log.ipAddress,
      ]);
    });

    const sorted = sortRecords(
      filtered,
      readString(query, 'sortBy') ?? 'timestamp',
      (readString(query, 'sortDir') as 'asc' | 'desc') ?? 'desc',
      (log, field) => (log as unknown as Record<string, string>)[field] ?? log.timestamp,
    );
    return paginate(sorted, query);
  }),

  route('GET', '/company', ({ db }) => {
    const company = db.companies.find((entry) => entry.id === db.activeCompanyId);
    if (!company) throw new ApiError(404, 'Perusahaan tidak ditemukan');
    return company;
  }),

  route('GET', '/companies', ({ db }) => db.companies),

  route('PUT', '/company', ({ db, body }) => {
    const index = db.companies.findIndex((entry) => entry.id === db.activeCompanyId);
    if (index === -1) throw new ApiError(404, 'Perusahaan tidak ditemukan');
    const updated: Company = { ...db.companies[index]!, ...(body as Partial<Company>) };
    db.companies[index] = updated;
    return updated;
  }),

  route('POST', '/company/switch', ({ db, body }) => {
    const { companyId } = body as { companyId: string };
    const company = db.companies.find((entry) => entry.id === companyId);
    if (!company) throw new ApiError(404, 'Perusahaan tidak ditemukan');
    db.activeCompanyId = company.id;
    return company;
  }),

  route('GET', '/me', ({ db }) => db.currentUser),
];
