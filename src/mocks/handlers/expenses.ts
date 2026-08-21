import type { Expense, ExpenseCategory, SelectOption } from '@/types';
import { ApiError } from '@/lib/api-error';
import { TODAY } from '@/utils/date';
import { matchesSearch, paginate, readString, sortRecords, withinRange } from '../query';
import { route, type Route } from '../router';

export const expenseRoutes: Route[] = [
  route('GET', '/expenses', ({ db, query }) => {
    const search = readString(query, 'search');
    const status = readString(query, 'status');
    const categoryId = readString(query, 'categoryId');
    const paymentAccountId = readString(query, 'paymentAccountId');
    const from = readString(query, 'from');
    const to = readString(query, 'to');

    const filtered = db.expenses.filter((expense) => {
      if (status && expense.status !== status) return false;
      if (categoryId && expense.categoryId !== categoryId) return false;
      if (paymentAccountId && expense.paymentAccountId !== paymentAccountId) return false;
      if (!withinRange(expense.date, from, to)) return false;
      return matchesSearch(search, [
        expense.number,
        expense.description,
        expense.categoryName,
        expense.reference,
        expense.vendorName,
      ]);
    });

    const sorted = sortRecords(
      filtered,
      readString(query, 'sortBy') ?? 'date',
      (readString(query, 'sortDir') as 'asc' | 'desc') ?? 'desc',
      (expense, field) => (expense as unknown as Record<string, string | number>)[field] ?? expense.date,
    );

    const page = paginate(sorted, query);
    return { ...page, filteredTotal: filtered.reduce((sum, expense) => sum + expense.total, 0) };
  }),

  route('GET', '/expenses/summary', ({ db }) => {
    const month = TODAY.slice(0, 7);
    const monthly = db.expenses.filter((expense) => expense.date.startsWith(month));
    return {
      count: db.expenses.length,
      pendingApproval: db.expenses.filter((expense) => expense.status === 'Submitted').length,
      pendingValue: db.expenses
        .filter((expense) => expense.status === 'Submitted')
        .reduce((sum, expense) => sum + expense.total, 0),
      monthTotal: monthly
        .filter((expense) => expense.status !== 'Rejected' && expense.status !== 'Draft')
        .reduce((sum, expense) => sum + expense.total, 0),
      monthBudget: db.expenseCategories
        .filter((category) => category.status === 'Active')
        .reduce((sum, category) => sum + category.monthlyBudget, 0),
      yearTotal: db.expenses
        .filter((expense) => expense.date.startsWith(TODAY.slice(0, 4)) && expense.status !== 'Rejected')
        .reduce((sum, expense) => sum + expense.total, 0),
    };
  }),

  route('GET', '/expenses/:id', ({ db, params }) => {
    const expense = db.expenses.find((entry) => entry.id === params.id);
    if (!expense) throw new ApiError(404, 'Biaya tidak ditemukan');
    return expense;
  }),

  route('POST', '/expenses', ({ db, body }) => {
    const payload = body as Partial<Expense> & { categoryId: string; paymentAccountId: string };
    const category = db.expenseCategories.find((entry) => entry.id === payload.categoryId);
    if (!category) throw new ApiError(422, 'Kategori biaya wajib dipilih', 'CATEGORY_REQUIRED');
    const account = db.bankAccounts.find((entry) => entry.id === payload.paymentAccountId);
    if (!account) throw new ApiError(422, 'Akun pembayaran wajib dipilih', 'ACCOUNT_REQUIRED');

    const amount = Number(payload.amount ?? 0);
    const taxAmount = Number(payload.taxAmount ?? 0);
    const sequence = db.expenses.length + 1;
    const created: Expense = {
      id: `exp-new-${sequence}`,
      number: `EXP-${(payload.date ?? TODAY).slice(0, 4)}-${String(sequence).padStart(4, '0')}`,
      date: payload.date ?? TODAY,
      categoryId: category.id,
      categoryName: category.name,
      description: payload.description ?? '',
      amount,
      taxAmount,
      total: amount + taxAmount,
      paymentAccountId: account.id,
      paymentAccountName: account.name,
      vendorName: payload.vendorName ?? '',
      reference: payload.reference ?? '',
      status: payload.status ?? 'Draft',
      notes: payload.notes ?? '',
      attachments: payload.attachments ?? [],
      submittedBy: db.currentUser.name,
      approvedBy: null,
      createdAt: new Date().toISOString(),
      createdBy: db.currentUser.name,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.expenses.unshift(created);
    return created;
  }),

  route('PUT', '/expenses/:id', ({ db, params, body }) => {
    const index = db.expenses.findIndex((entry) => entry.id === params.id);
    if (index === -1) throw new ApiError(404, 'Biaya tidak ditemukan');
    const existing = db.expenses[index]!;
    const payload = body as Partial<Expense>;
    const category = payload.categoryId
      ? db.expenseCategories.find((entry) => entry.id === payload.categoryId)
      : undefined;
    const account = payload.paymentAccountId
      ? db.bankAccounts.find((entry) => entry.id === payload.paymentAccountId)
      : undefined;
    const amount = Number(payload.amount ?? existing.amount);
    const taxAmount = Number(payload.taxAmount ?? existing.taxAmount);

    const updated: Expense = {
      ...existing,
      ...payload,
      categoryId: category?.id ?? existing.categoryId,
      categoryName: category?.name ?? existing.categoryName,
      paymentAccountId: account?.id ?? existing.paymentAccountId,
      paymentAccountName: account?.name ?? existing.paymentAccountName,
      amount,
      taxAmount,
      total: amount + taxAmount,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.expenses[index] = updated;
    return updated;
  }),

  route('PATCH', '/expenses/:id/status', ({ db, params, body }) => {
    const expense = db.expenses.find((entry) => entry.id === params.id);
    if (!expense) throw new ApiError(404, 'Biaya tidak ditemukan');
    const status = (body as { status: Expense['status'] }).status;
    expense.status = status;
    if (status === 'Approved' || status === 'Paid') expense.approvedBy = db.currentUser.name;
    if (status === 'Rejected') expense.approvedBy = null;
    expense.updatedAt = new Date().toISOString();
    expense.updatedBy = db.currentUser.name;
    return expense;
  }),

  route('DELETE', '/expenses/:id', ({ db, params }) => {
    const expense = db.expenses.find((entry) => entry.id === params.id);
    if (!expense) throw new ApiError(404, 'Biaya tidak ditemukan');
    if (expense.status === 'Paid') throw new ApiError(422, 'Biaya yang sudah dibayar tidak dapat dihapus', 'EXPENSE_LOCKED');
    db.expenses = db.expenses.filter((entry) => entry.id !== expense.id);
    return { success: true };
  }),

  route('GET', '/expense-categories', ({ db, query }) => {
    const search = readString(query, 'search');
    const status = readString(query, 'status');
    const filtered = db.expenseCategories.filter((category) => {
      if (status && category.status !== status) return false;
      return matchesSearch(search, [category.code, category.name, category.glAccountCode, category.glAccountName]);
    });
    const sorted = sortRecords(
      filtered,
      readString(query, 'sortBy') ?? 'code',
      (readString(query, 'sortDir') as 'asc' | 'desc') ?? 'asc',
      (category, field) => (category as unknown as Record<string, string | number>)[field] ?? category.code,
    );
    return paginate(sorted, query);
  }),

  route('GET', '/expense-categories/options', ({ db }) =>
    db.expenseCategories
      .filter((category) => category.status === 'Active')
      .map<SelectOption>((category) => ({
        value: category.id,
        label: category.name,
        description: `${category.glAccountCode} · ${category.glAccountName}`,
      })),
  ),

  route('POST', '/expense-categories', ({ db, body }) => {
    const payload = body as Partial<ExpenseCategory>;
    const glAccount = db.accounts.find((entry) => entry.id === payload.glAccountId);
    if (!glAccount) throw new ApiError(422, 'Akun buku besar wajib dipilih', 'ACCOUNT_REQUIRED');
    const created: ExpenseCategory = {
      id: `excat-new-${db.expenseCategories.length + 1}`,
      code: payload.code ?? `EXC-${String(db.expenseCategories.length + 1).padStart(2, '0')}`,
      name: payload.name ?? '',
      glAccountId: glAccount.id,
      glAccountCode: glAccount.code,
      glAccountName: glAccount.name,
      monthlyBudget: Number(payload.monthlyBudget ?? 0),
      spentThisMonth: 0,
      status: payload.status ?? 'Active',
      description: payload.description ?? '',
      createdAt: new Date().toISOString(),
      createdBy: db.currentUser.name,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.expenseCategories.push(created);
    return created;
  }),

  route('PUT', '/expense-categories/:id', ({ db, params, body }) => {
    const index = db.expenseCategories.findIndex((entry) => entry.id === params.id);
    if (index === -1) throw new ApiError(404, 'Kategori tidak ditemukan');
    const payload = body as Partial<ExpenseCategory>;
    const glAccount = payload.glAccountId
      ? db.accounts.find((entry) => entry.id === payload.glAccountId)
      : undefined;
    const updated: ExpenseCategory = {
      ...db.expenseCategories[index]!,
      ...payload,
      glAccountId: glAccount?.id ?? db.expenseCategories[index]!.glAccountId,
      glAccountCode: glAccount?.code ?? db.expenseCategories[index]!.glAccountCode,
      glAccountName: glAccount?.name ?? db.expenseCategories[index]!.glAccountName,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.expenseCategories[index] = updated;
    return updated;
  }),

  route('PATCH', '/expense-categories/:id/status', ({ db, params, body }) => {
    const category = db.expenseCategories.find((entry) => entry.id === params.id);
    if (!category) throw new ApiError(404, 'Kategori tidak ditemukan');
    category.status = (body as { status: 'Active' | 'Inactive' }).status;
    return category;
  }),

  route('DELETE', '/expense-categories/:id', ({ db, params }) => {
    const used = db.expenses.some((expense) => expense.categoryId === params.id);
    if (used) throw new ApiError(422, 'Kategori sudah digunakan pada transaksi biaya', 'CATEGORY_IN_USE');
    db.expenseCategories = db.expenseCategories.filter((entry) => entry.id !== params.id);
    return { success: true };
  }),
];
