import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';

export function RowActions({ children, label = 'Tindakan baris' }: { children: ReactNode | ((props: { close: () => void }) => ReactNode); label?: string }) {
  return (
    <div onClick={(event) => event.stopPropagation()} className="flex justify-end">
      <Dropdown
        align="right"
        width="w-48"
        trigger={({ toggle }) => (
          <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={label}>
            <MoreHorizontal className="size-4" />
          </Button>
        )}
      >
        {children}
      </Dropdown>
    </div>
  );
}
