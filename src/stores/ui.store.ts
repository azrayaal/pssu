import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TableDensity = 'comfortable' | 'compact';

interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  searchOpen: boolean;
  density: TableDensity;
  expandedGroups: string[];
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setDensity: (density: TableDensity) => void;
  toggleGroup: (group: string) => void;
  setExpandedGroups: (groups: string[]) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      searchOpen: false,
      density: 'comfortable',
      expandedGroups: ['Accounting', 'Sales'],
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setDensity: (density) => set({ density }),
      toggleGroup: (group) =>
        set((state) => ({
          expandedGroups: state.expandedGroups.includes(group)
            ? state.expandedGroups.filter((entry) => entry !== group)
            : [...state.expandedGroups, group],
        })),
      setExpandedGroups: (expandedGroups) => set({ expandedGroups }),
    }),
    {
      name: 'pssu.ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        density: state.density,
        expandedGroups: state.expandedGroups,
      }),
    },
  ),
);
