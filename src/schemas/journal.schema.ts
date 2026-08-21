import { z } from 'zod';
import { isoDateSchema, optionalString } from './common.schema';

export const journalLineSchema = z
  .object({
    accountId: z.string().min(1, 'Akun wajib dipilih'),
    description: optionalString,
    debit: z.number().nonnegative('Debit tidak boleh negatif').default(0),
    credit: z.number().nonnegative('Kredit tidak boleh negatif').default(0),
  })
  .refine((line) => !(line.debit > 0 && line.credit > 0), {
    message: 'Satu baris hanya boleh diisi debit atau kredit',
    path: ['credit'],
  })
  .refine((line) => line.debit > 0 || line.credit > 0, {
    message: 'Isi nilai debit atau kredit',
    path: ['debit'],
  });

export const journalSchema = z
  .object({
    date: isoDateSchema,
    reference: z.string().trim().min(1, 'Nomor referensi wajib diisi').max(40),
    memo: z.string().trim().min(5, 'Keterangan minimal 5 karakter').max(200),
    status: z.enum(['Draft', 'Posted']).default('Draft'),
    lines: z.array(journalLineSchema).min(2, 'Jurnal memerlukan minimal dua baris'),
  })
  .refine(
    (values) => {
      const debit = values.lines.reduce((sum, line) => sum + line.debit, 0);
      const credit = values.lines.reduce((sum, line) => sum + line.credit, 0);
      return debit === credit;
    },
    { message: 'Total debit dan kredit harus seimbang', path: ['lines'] },
  )
  .refine((values) => values.lines.reduce((sum, line) => sum + line.debit, 0) > 0, {
    message: 'Nilai jurnal tidak boleh nol',
    path: ['lines'],
  });

export type JournalFormValues = z.infer<typeof journalSchema>;
export type JournalLineFormValues = z.infer<typeof journalLineSchema>;

export type JournalFormInput = z.input<typeof journalSchema>;
