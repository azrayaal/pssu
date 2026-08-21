import { z } from 'zod';

export const isoDateSchema = z
  .string()
  .min(1, 'Tanggal wajib diisi')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid');

export const currencyAmountSchema = z
  .number({ message: 'Nilai wajib diisi' })
  .nonnegative('Nilai tidak boleh negatif');

export const recordStatusSchema = z.enum(['Active', 'Inactive']);

export const optionalString = z.string().trim().optional().default('');

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email wajib diisi')
  .email('Format email tidak valid');

export const phoneSchema = z
  .string()
  .trim()
  .min(7, 'Nomor telepon minimal 7 digit')
  .regex(/^[0-9+\-() ]+$/, 'Nomor telepon hanya boleh berisi angka dan tanda hubung');
