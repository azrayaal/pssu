import { Check, Minus } from 'lucide-react';
import type { PermissionAction, PermissionMatrix } from '@/types';
import { PERMISSION_ACTIONS, PERMISSION_MODULES } from '@/types';
import { Checkbox } from '@/components/ui/Field';
import { cn } from '@/lib/cn';

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'Lihat',
  create: 'Buat',
  edit: 'Ubah',
  delete: 'Hapus',
  approve: 'Setujui',
  export: 'Ekspor',
};

export interface PermissionMatrixTableProps {
  permissions: PermissionMatrix;
  readOnly?: boolean;
  onToggle?: (module: string, action: PermissionAction, value: boolean) => void;
  onToggleModule?: (module: string, value: boolean) => void;
  onToggleAction?: (action: PermissionAction, value: boolean) => void;
}

export function PermissionMatrixTable({
  permissions,
  readOnly = false,
  onToggle,
  onToggleModule,
  onToggleAction,
}: PermissionMatrixTableProps) {
  const moduleAllGranted = (module: string): boolean =>
    PERMISSION_ACTIONS.every((action) => permissions[module]?.[action]);

  const actionAllGranted = (action: PermissionAction): boolean =>
    PERMISSION_MODULES.every((module) => permissions[module]?.[action]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <thead className="bg-ink-50">
          <tr className="border-b border-ink-200">
            <th className="sticky left-0 z-10 min-w-[15rem] bg-ink-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Modul
            </th>
            {PERMISSION_ACTIONS.map((action) => (
              <th key={action} className="w-28 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                <span className="block">{ACTION_LABELS[action]}</span>
                {!readOnly && onToggleAction ? (
                  <button
                    type="button"
                    onClick={() => onToggleAction(action, !actionAllGranted(action))}
                    className="mt-1 text-[10px] font-medium normal-case text-brand-700 hover:underline"
                  >
                    {actionAllGranted(action) ? 'Batalkan semua' : 'Pilih semua'}
                  </button>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {PERMISSION_MODULES.map((module) => (
            <tr key={module} className="hover:bg-ink-50">
              <td className="sticky left-0 z-10 bg-white px-4 py-2 group-hover:bg-ink-50">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-800">{module}</span>
                  {!readOnly && onToggleModule ? (
                    <button
                      type="button"
                      onClick={() => onToggleModule(module, !moduleAllGranted(module))}
                      className="shrink-0 text-[11px] font-medium text-brand-700 hover:underline"
                    >
                      {moduleAllGranted(module) ? 'Batalkan' : 'Semua'}
                    </button>
                  ) : null}
                </div>
              </td>
              {PERMISSION_ACTIONS.map((action) => {
                const granted = Boolean(permissions[module]?.[action]);
                return (
                  <td key={action} className="px-3 py-2 text-center">
                    {readOnly ? (
                      <span
                        className={cn(
                          'inline-flex size-6 items-center justify-center rounded border',
                          granted
                            ? 'border-positive-100 bg-positive-50 text-positive-700'
                            : 'border-ink-200 bg-ink-50 text-ink-300',
                        )}
                        aria-label={granted ? `${ACTION_LABELS[action]} diizinkan` : `${ACTION_LABELS[action]} tidak diizinkan`}
                      >
                        {granted ? <Check className="size-3.5" /> : <Minus className="size-3.5" />}
                      </span>
                    ) : (
                      <Checkbox
                        className="justify-center"
                        checked={granted}
                        aria-label={`${ACTION_LABELS[action]} pada modul ${module}`}
                        onChange={(event) => onToggle?.(module, action, event.target.checked)}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
