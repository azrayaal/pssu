import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useUiStore } from '@/stores/ui.store';
import { SidebarBrand, SidebarContent } from './Sidebar';

export function MobileNav() {
  const open = useUiStore((state) => state.mobileNavOpen);
  const setOpen = useUiStore((state) => state.setMobileNavOpen);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, setOpen]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink-900/50" onClick={() => setOpen(false)} aria-hidden />
      <div className="absolute inset-y-0 left-0 flex w-[17rem] flex-col bg-brand-700">
        <div className="flex items-center justify-between border-b border-brand-600/50 pr-2">
          <div className="flex-1">
            <SidebarBrand collapsed={false} />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-brand-100 transition-colors hover:bg-brand-800 hover:text-white"
            aria-label="Tutup navigasi"
          >
            <X className="size-4.5" />
          </button>
        </div>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </div>
    </div>,
    document.body,
  );
}
