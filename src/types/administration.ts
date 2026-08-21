import type { AuditStamp, ID, ISODate } from './common';
import type { RecordStatus } from './accounting';

export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'export',
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_MODULES = [
  'Dashboard',
  'Chart of Accounts',
  'Journal Entries',
  'General Ledger',
  'Customers',
  'Sales Invoices',
  'Vendors',
  'Purchase Orders',
  'Purchase Invoices',
  'Cash & Bank',
  'Bank Reconciliation',
  'Expenses',
  'Reports',
  'Users & Roles',
  'Company Settings',
] as const;
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export type PermissionMatrix = Record<string, Record<PermissionAction, boolean>>;

export interface Role extends AuditStamp {
  id: ID;
  name: string;
  description: string;
  userCount: number;
  isSystem: boolean;
  permissions: PermissionMatrix;
}

export interface User extends AuditStamp {
  id: ID;
  name: string;
  email: string;
  phone: string;
  roleId: ID;
  roleName: string;
  department: string;
  jobTitle: string;
  status: RecordStatus;
  lastLoginAt: ISODate | null;
  initials: string;
}

export type AuditAction =
  | 'Create'
  | 'Update'
  | 'Delete'
  | 'Post'
  | 'Void'
  | 'Approve'
  | 'Login'
  | 'Logout'
  | 'Export';

export interface AuditLog {
  id: ID;
  timestamp: ISODate;
  userId: ID;
  userName: string;
  action: AuditAction;
  module: string;
  reference: string;
  description: string;
  ipAddress: string;
  userAgent: string;
}
