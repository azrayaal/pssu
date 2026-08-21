import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/cn';
import { NAVIGATION, type NavGroup } from '@/app/navigation';
import { useUiStore } from '@/stores/ui.store';
import { Tooltip } from '@/components/ui/Tooltip';

function isGroupActive(group: NavGroup, pathname: string): boolean {
  if (group.path) return group.path === '/' ? pathname === '/' : pathname.startsWith(group.path);
  return (group.children ?? []).some((child) => pathname.startsWith(child.path));
}

function isLeafActive(path: string, pathname: string): boolean {
  if (path === '/expenses') return pathname === '/expenses' || pathname.startsWith('/expenses/exp-');
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const expandedGroups = useUiStore((state) => state.expandedGroups);
  const toggleGroup = useUiStore((state) => state.toggleGroup);
  const setExpandedGroups = useUiStore((state) => state.setExpandedGroups);

  // Keep the group containing the current route open.
  useEffect(() => {
    const active = NAVIGATION.find((group) => group.children && isGroupActive(group, pathname));
    if (active && !expandedGroups.includes(active.id)) {
      setExpandedGroups([...expandedGroups, active.id]);
    }
  }, [pathname, expandedGroups, setExpandedGroups]);

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3" aria-label="Navigasi utama">
      <ul className="space-y-0.5">
        {NAVIGATION.map((group) => {
          const Icon = group.icon;
          const active = isGroupActive(group, pathname);
          const open = expandedGroups.includes(group.id);

          if (group.path) {
            const link = (
              <NavLink
                to={group.path}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
                  active ? 'bg-brand-900 text-white' : 'text-brand-100 hover:bg-brand-800 hover:text-white',
                  collapsed && 'justify-center px-0',
                )}
              >
                <Icon className="size-4.5 shrink-0" aria-hidden />
                {!collapsed && <span className="truncate">{group.label}</span>}
              </NavLink>
            );
            return (
              <li key={group.id}>
                {collapsed ? (
                  <Tooltip content={group.label} side="right" className="w-full">
                    {link}
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          }

          if (collapsed) {
            return (
              <li key={group.id}>
                <Tooltip
                  side="right"
                  className="w-full"
                  content={
                    <span className="block">
                      <span className="block font-semibold">{group.label}</span>
                      <span className="mt-0.5 block text-brand-100">
                        {(group.children ?? []).map((child) => child.label).join(' · ')}
                      </span>
                    </span>
                  }
                >
                  <NavLink
                    to={group.children![0]!.path}
                    onClick={onNavigate}
                    className={cn(
                      'flex w-full items-center justify-center rounded-md py-2 transition-colors',
                      active ? 'bg-brand-900 text-white' : 'text-brand-100 hover:bg-brand-800 hover:text-white',
                    )}
                  >
                    <Icon className="size-4.5 shrink-0" aria-hidden />
                  </NavLink>
                </Tooltip>
              </li>
            );
          }

          return (
            <li key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={open}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
                  active ? 'text-white' : 'text-brand-100 hover:bg-brand-800 hover:text-white',
                )}
              >
                <Icon className="size-4.5 shrink-0" aria-hidden />
                <span className="flex-1 truncate text-left">{group.label}</span>
                <ChevronDown className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
              </button>

              {open ? (
                <ul className="relative ml-[1.4rem] mt-0.5 space-y-0.5 border-l border-brand-600/60 pl-2.5">
                  {(group.children ?? []).map((child) => (
                    <li key={child.path}>
                      <NavLink
                        to={child.path}
                        onClick={onNavigate}
                        end={child.path === '/expenses'}
                        className={({ isActive }) =>
                          cn(
                            'block rounded px-2.5 py-1.5 text-[13px] transition-colors',
                            isActive || isLeafActive(child.path, pathname)
                              ? 'bg-brand-900 font-medium text-white'
                              : 'text-brand-100/85 hover:bg-brand-800 hover:text-white',
                          )
                        }
                      >
                        {child.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5 border-b border-brand-600/50 px-4 py-3.5', collapsed && 'justify-center px-0')}>
      <span className="flex size-8 shrink-0 items-center justify-center  bg-white text-[13px] rounded-full font-bold text-brand-800">
        PT
      </span>
      {!collapsed ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-tight text-white">PTSU Accounting</span>
          <span className="block truncate text-[11px] leading-tight text-brand-200">Financial Management</span>
        </span>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col bg-brand-700 transition-[width] duration-200 lg:flex print-hidden',
        collapsed ? 'w-[4.25rem]' : 'w-60',
      )}
    >
      <SidebarBrand collapsed={collapsed} />
      <SidebarContent />
      <div className="border-t border-brand-600/50 p-2.5">
        <button
          type="button"
          onClick={toggleSidebar}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-brand-100 transition-colors hover:bg-brand-800 hover:text-white',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Perlebar navigasi' : 'Perkecil navigasi'}
        >
          {collapsed ? <PanelLeftOpen className="size-4.5" /> : <PanelLeftClose className="size-4.5" />}
          {!collapsed && <span></span>}
        </button>
      </div>
    </aside>
  );
}
