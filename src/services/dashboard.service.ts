import { apiClient } from '@/lib/api-client';
import type { DashboardData } from '@/types';

export interface SearchGroup {
  label: string;
  items: { id: string; title: string; subtitle: string; path: string }[];
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  path: string;
  timestamp: string;
}

export const dashboardService = {
  get: (period: string) => apiClient.get<DashboardData>('/dashboard', { params: { period } }),
  search: (q: string) => apiClient.get<{ groups: SearchGroup[] }>('/search', { params: { q } }),
  notifications: () =>
    apiClient.get<{ items: NotificationItem[]; unreadCount: number }>('/notifications'),
};
