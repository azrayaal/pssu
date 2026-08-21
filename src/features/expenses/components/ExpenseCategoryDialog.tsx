import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExpenseCategory } from '@/types';
import {
  expenseCategorySchema,
  expenseCategoryDefaults,
  type ExpenseCategoryFormInput,
  type ExpenseCategoryFormValues,
} from '@/schemas/expense-category.schema';
import { expensesService } from '@/services/expenses.service';
import { accountingService } from '@/services/accounting.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/Field';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

export function ExpenseCategoryDialog({
  open,
  onClose,
  category,
}: {
  open: boolean;
  onClose: () => void;
  category: ExpenseCategory | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(category);

  const { data: glOptions } = useQuery({
    queryKey: [...queryKeys.accounts.options, 'expense'],
    queryFn: () => accountingService.accountOptions({ type: 'Expense' }),
    enabled: open,
  });

  const form = useForm<ExpenseCategoryFormInput, unknown, ExpenseCategoryFormValues>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: expenseCategoryDefaults,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      category
        ? {
            code: category.code,
            name: category.name,
            glAccountId: category.glAccountId,
            monthlyBudget: category.monthlyBudget,
            status: category.status,
            description: category.description,
          }
        : expenseCategoryDefaults,
    );
  }, [open, category, form]);

  const mutation = useMutation({
    mutationFn: (values: ExpenseCategoryFormValues) =>
      isEdit ? expensesService.updateCategory(category!.id, values) : expensesService.createCategory(values),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.all });
      toast.success(isEdit ? 'Kategori diperbarui' : 'Kategori berhasil dibuat', `${saved.code} · ${saved.name}`);
      onClose();
    },
    onError: (error: Error) => toast.error('Kategori gagal disimpan', error.message),
  });

  const errors = form.formState.errors;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? `Ubah Kategori ${category?.code}` : 'Tambah Kategori Biaya'}
      description="Kategori menentukan akun buku besar yang dibebani saat biaya dibayarkan."
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button variant="primary" loading={mutation.isPending} onClick={form.handleSubmit((values) => mutation.mutate(values))}>
            {isEdit ? 'Simpan perubahan' : 'Simpan kategori'}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Field label="Kode Kategori" htmlFor="catCode" required error={errors.code?.message} hint="Format EXC-01">
          <TextInput id="catCode" placeholder="EXC-14" invalid={Boolean(errors.code)} {...form.register('code')} />
        </Field>
        <Field label="Nama Kategori" htmlFor="catName" required error={errors.name?.message}>
          <TextInput id="catName" placeholder="Perlengkapan Kantor" invalid={Boolean(errors.name)} {...form.register('name')} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Akun Buku Besar" htmlFor="catGl" required error={errors.glAccountId?.message}>
            <SelectInput id="catGl" invalid={Boolean(errors.glAccountId)} {...form.register('glAccountId')}>
              <option value="">Pilih akun beban</option>
              {(glOptions ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field label="Anggaran Bulanan" htmlFor="catBudget" error={errors.monthlyBudget?.message}>
          <Controller
            control={form.control}
            name="monthlyBudget"
            render={({ field }) => (
              <CurrencyInput id="catBudget" value={Number(field.value ?? 0)} onValueChange={field.onChange} />
            )}
          />
        </Field>
        <Field label="Status" htmlFor="catStatus">
          <SelectInput id="catStatus" {...form.register('status')}>
            <option value="Active">Aktif</option>
            <option value="Inactive">Nonaktif</option>
          </SelectInput>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Keterangan" htmlFor="catDescription" error={errors.description?.message}>
            <TextArea id="catDescription" rows={2} {...form.register('description')} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
