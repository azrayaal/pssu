import { z } from 'zod';
import { PERMISSION_ACTIONS } from '@/types';

const actionMapSchema = z.object(
  Object.fromEntries(PERMISSION_ACTIONS.map((action) => [action, z.boolean()])) as Record<
    (typeof PERMISSION_ACTIONS)[number],
    z.ZodBoolean
  >,
);

export const roleSchema = z.object({
  name: z.string().trim().min(3, 'Nama peran minimal 3 karakter').max(60),
  description: z.string().trim().min(10, 'Deskripsi minimal 10 karakter').max(200),
  permissions: z.record(z.string(), actionMapSchema),
});

export type RoleFormValues = z.infer<typeof roleSchema>;

export type RoleFormInput = z.input<typeof roleSchema>;
