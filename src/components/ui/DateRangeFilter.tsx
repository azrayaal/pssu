import { Calendar } from 'lucide-react';
import type { DateRange } from '@/types';
import { PERIOD_PRESETS, resolvePeriod, type PeriodPresetKey } from '@/utils/date';
import { SelectInput, TextInput } from './Field';
import { cn } from '@/lib/cn';

export interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  preset?: PeriodPresetKey | 'custom';
  onPresetChange?: (preset: PeriodPresetKey | 'custom') => void;
  className?: string;
  compact?: boolean;
}

export function DateRangeFilter({
  value,
  onChange,
  preset = 'custom',
  onPresetChange,
  className,
  compact = false,
}: DateRangeFilterProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <SelectInput
        className={cn('w-40', compact && 'h-8 py-1 text-[13px]')}
        value={preset}
        aria-label="Periode laporan"
        onChange={(event) => {
          const next = event.target.value as PeriodPresetKey | 'custom';
          onPresetChange?.(next);
          if (next !== 'custom') onChange(resolvePeriod(next));
        }}
      >
        {PERIOD_PRESETS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
        <option value="custom">Periode Kustom</option>
      </SelectInput>

      <div className="flex items-center gap-1.5">
        <Calendar className="size-4 shrink-0 text-ink-400" aria-hidden />
        <TextInput
          type="date"
          className={cn('w-[9.5rem]', compact && 'h-8 py-1 text-[13px]')}
          value={value.from}
          max={value.to}
          aria-label="Tanggal mulai"
          onChange={(event) => {
            onPresetChange?.('custom');
            onChange({ ...value, from: event.target.value });
          }}
        />
        <span className="text-ink-400">&ndash;</span>
        <TextInput
          type="date"
          className={cn('w-[9.5rem]', compact && 'h-8 py-1 text-[13px]')}
          value={value.to}
          min={value.from}
          aria-label="Tanggal akhir"
          onChange={(event) => {
            onPresetChange?.('custom');
            onChange({ ...value, to: event.target.value });
          }}
        />
      </div>
    </div>
  );
}
