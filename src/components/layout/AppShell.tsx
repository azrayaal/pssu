import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Topbar } from './Topbar';

function RouteFallback() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <span className="inline-flex items-center gap-2.5 text-[13px] text-ink-500">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Menyiapkan halaman
      </span>
    </div>
  );
}

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <Sidebar />
      <MobileNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="print-region flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto w-full max-w-[112rem] px-4 py-5 sm:px-6 sm:py-6">
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
