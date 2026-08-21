import { useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { queryClient } from '@/lib/query-client';
import { bootstrapApi } from '@/lib/bootstrap';
import { Toaster } from '@/components/ui/Toaster';

function BootScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-ink-50">
      <div className="flex flex-col items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-md bg-brand-700 text-sm font-bold text-white">
          PS
        </span>
        <span className="inline-flex items-center gap-2 text-[13px] text-ink-500">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Menyiapkan aplikasi
        </span>
      </div>
    </div>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bootstrapApi().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return <BootScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
