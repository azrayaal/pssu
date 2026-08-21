import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  HelpCircle,
  LogOut,
  Menu,
  Settings,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from '@/components/ui/Dropdown';
import { administrationService } from '@/services/administration.service';
import { dashboardService } from '@/services/dashboard.service';
import { queryKeys } from '@/lib/query-keys';
import { useCompanyStore } from '@/stores/company.store';
import { useUiStore } from '@/stores/ui.store';
import { toast } from '@/stores/toast.store';
import { formatDateTime } from '@/utils/date';
import { GlobalSearch } from './GlobalSearch';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-negative-600',
  warning: 'bg-caution-600',
  info: 'bg-info-600',
};

export function Topbar() {
  const navigate = useNavigate();
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const activeCompanyId = useCompanyStore((state) => state.activeCompanyId);
  const setActiveCompany = useCompanyStore((state) => state.setActiveCompany);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: administrationService.listCompanies,
    staleTime: Infinity,
  });
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: administrationService.me,
    staleTime: Infinity,
  });
  const { data: notifications } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: dashboardService.notifications,
    refetchInterval: 120_000,
  });

  const activeCompany = companies?.find((company) => company.id === activeCompanyId) ?? companies?.[0];
  const unread = notifications?.unreadCount ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-ink-200 bg-white px-3 sm:px-4 print-hidden">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Buka navigasi"
      >
        <Menu className="size-5" />
      </Button>

      <Dropdown
        align="left"
        width="w-72"
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            className="flex h-9 items-center gap-2 rounded-md border border-ink-300 bg-white px-2.5 text-left transition-colors hover:bg-ink-50"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold text-white">
              {activeCompany?.initials ?? 'PT'}
            </span>
            <span className="hidden min-w-0 flex-col sm:flex">
              <span className="truncate text-[13px] font-medium leading-tight text-ink-800">
                {activeCompany?.name ?? 'Memuat'}
              </span>
              <span className="truncate text-[11px] leading-tight text-ink-500">Tahun buku 2026</span>
            </span>
            <ChevronDown className={cn('size-3.5 shrink-0 text-ink-400 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      >
        {({ close }) => (
          <>
            <DropdownLabel>Entitas perusahaan</DropdownLabel>
            {(companies ?? []).map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => {
                  setActiveCompany(company.id);
                  close();
                  toast.success('Entitas berpindah', `Konteks data beralih ke ${company.name}`);
                }}
                className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-ink-100"
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded bg-ink-100 text-[10px] font-bold text-ink-600">
                  {company.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink-800">{company.name}</span>
                  <span className="block truncate text-xs text-ink-500">{company.taxId}</span>
                </span>
                {company.id === activeCompanyId ? <Check className="mt-1 size-3.5 shrink-0 text-brand-700" /> : null}
              </button>
            ))}
            <DropdownSeparator />
            <DropdownItem
              icon={<Building2 className="size-3.5" />}
              onClick={() => {
                close();
                navigate('/administration/company');
              }}
            >
              Kelola data perusahaan
            </DropdownItem>
          </>
        )}
      </Dropdown>

      <div className="ml-auto hidden flex-1 justify-center px-4 md:flex">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex items-center gap-1 md:ml-0">
        <Dropdown
          width="w-[22rem]"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="relative flex size-9 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
              aria-label={`Notifikasi (${unread} belum dibaca)`}
            >
              <Bell className="size-4.5" />
              {unread > 0 ? (
                <span className="tabular absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-brand-700 px-1 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              ) : null}
            </button>
          )}
        >
          {({ close }) => (
            <>
              <div className="flex items-center justify-between px-3.5 py-2">
                <p className="text-[13px] font-semibold text-ink-900">Notifikasi</p>
                <span className="tabular text-xs text-ink-500">{unread} item</span>
              </div>
              <DropdownSeparator />
              <div className="max-h-80 overflow-y-auto">
                {(notifications?.items ?? []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate(item.path);
                      close();
                    }}
                    className="flex w-full gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-ink-100"
                  >
                    <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', SEVERITY_STYLES[item.severity])} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-ink-800">{item.title}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-ink-500">{item.description}</span>
                      <span className="mt-1 block text-[11px] text-ink-400">{formatDateTime(item.timestamp)}</span>
                    </span>
                  </button>
                ))}
                {!notifications?.items.length ? (
                  <p className="px-3.5 py-6 text-center text-[13px] text-ink-500">Tidak ada notifikasi baru</p>
                ) : null}
              </div>
            </>
          )}
        </Dropdown>

        <Link
          to="/administration/company"
          className="hidden size-9 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700 sm:flex"
          aria-label="Pengaturan"
        >
          <Settings className="size-4.5" />
        </Link>

        <Dropdown
          width="w-60"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-ink-100"
              aria-label="Menu pengguna"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-700 text-[11px] font-semibold text-white">
                {currentUser?.initials ?? 'PT'}
              </span>
              <span className="hidden min-w-0 flex-col text-left lg:flex">
                <span className="truncate text-[13px] font-medium leading-tight text-ink-800">
                  {currentUser?.name ?? 'Memuat'}
                </span>
                <span className="truncate text-[11px] leading-tight text-ink-500">{currentUser?.roleName}</span>
              </span>
              <ChevronDown className="hidden size-3.5 text-ink-400 lg:block" />
            </button>
          )}
        >
          {({ close }) => (
            <>
              <div className="px-3.5 py-2.5">
                <p className="text-[13px] font-semibold text-ink-900">{currentUser?.name}</p>
                <p className="truncate text-xs text-ink-500">{currentUser?.email}</p>
              </div>
              <DropdownSeparator />
              <DropdownItem
                icon={<UserCog className="size-3.5" />}
                onClick={() => {
                  close();
                  if (currentUser) navigate(`/administration/users/${currentUser.id}`);
                }}
              >
                Profil saya
              </DropdownItem>
              <DropdownItem
                icon={<Settings className="size-3.5" />}
                onClick={() => {
                  close();
                  navigate('/administration/company');
                }}
              >
                Pengaturan perusahaan
              </DropdownItem>
              <DropdownItem
                icon={<HelpCircle className="size-3.5" />}
                onClick={() => {
                  close();
                  toast.info('Pusat bantuan', 'Dokumentasi pengguna akan tersedia pada rilis berikutnya.');
                }}
              >
                Pusat bantuan
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<LogOut className="size-3.5" />}
                destructive
                onClick={() => {
                  close();
                  toast.info('Sesi berakhir', 'Autentikasi akan ditangani oleh backend pada integrasi berikutnya.');
                }}
              >
                Keluar
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </div>
    </header>
  );
}
