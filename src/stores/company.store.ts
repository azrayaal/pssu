import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PeriodPresetKey } from '@/utils/date';

interface CompanyState {
  activeCompanyId: string;
  dashboardPeriod: '3m' | '6m' | '12m';
  defaultReportPeriod: PeriodPresetKey;
  setActiveCompany: (id: string) => void;
  setDashboardPeriod: (period: '3m' | '6m' | '12m') => void;
  setDefaultReportPeriod: (period: PeriodPresetKey) => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      activeCompanyId: 'co-pssu',
      dashboardPeriod: '12m',
      defaultReportPeriod: 'year-to-date',
      setActiveCompany: (activeCompanyId) => set({ activeCompanyId }),
      setDashboardPeriod: (dashboardPeriod) => set({ dashboardPeriod }),
      setDefaultReportPeriod: (defaultReportPeriod) => set({ defaultReportPeriod }),
    }),
    { name: 'pssu.company' },
  ),
);
