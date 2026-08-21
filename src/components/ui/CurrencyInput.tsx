import { useEffect, useState } from 'react';
import { TextInput, type TextInputProps } from './Field';

function digitsToNumber(value: string): number {
  const cleaned = value.replace(/[^\d]/g, '');
  return cleaned ? Number(cleaned) : 0;
}

function format(value: number): string {
  if (!value) return '';
  return new Intl.NumberFormat('id-ID').format(value);
}

export interface CurrencyInputProps extends Omit<TextInputProps, 'value' | 'onChange' | 'type'> {
  value: number;
  onValueChange: (value: number) => void;
  currencyPrefix?: string;
}

/** Rupiah input with thousand separators and a numeric value contract. */
export function CurrencyInput({
  value,
  onValueChange,
  currencyPrefix = 'Rp',
  ...props
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(() => format(value));

  useEffect(() => {
    setDisplay((current) => (digitsToNumber(current) === value ? current : format(value)));
  }, [value]);

  return (
    <TextInput
      inputMode="numeric"
      align="right"
      prefix={currencyPrefix}
      value={display}
      onChange={(event) => {
        const next = digitsToNumber(event.target.value);
        setDisplay(format(next));
        onValueChange(next);
      }}
      {...props}
    />
  );
}
