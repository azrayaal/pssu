import { z } from 'zod';
import { emailSchema, phoneSchema, recordStatusSchema } from './common.schema';

export const userSchema = z.object({
  name: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter').max(80),
  email: emailSchema,
  phone: phoneSchema,
  roleId: z.string().min(1, 'Peran wajib dipilih'),
  department: z.string().trim().min(2, 'Departemen wajib diisi'),
  jobTitle: z.string().trim().min(2, 'Jabatan wajib diisi'),
  status: recordStatusSchema.default('Active'),
});

export type UserFormValues = z.infer<typeof userSchema>;

export const userDefaults: UserFormValues = {
  name: '',
  email: '',
  phone: '',
  roleId: '',
  department: '',
  jobTitle: '',
  status: 'Active',
};

export type UserFormInput = z.input<typeof userSchema>;
