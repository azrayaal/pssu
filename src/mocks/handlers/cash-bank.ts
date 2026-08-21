import type {
  BankAccount,
  CashTransaction,
  ReconciliationMatch,
  ReconciliationSession,
  SelectOption,
  StatementLine,
} from '@/types';
import { ApiError } from '@/lib/api-error';
import { TODAY } from '@/utils/date';
import { createRng } from '../seed/rng';
import { matchesSearch, paginate, readString, sortRecords, withinRange } from '../query';
import { route, type Route } from '../router';

export const cashBankRoutes: Route[] = [
  route('GET', '/bank-accounts', ({ db, query }) => {
    const search = readString(query, 'search');
    const status = readString(query, 'status');
    const kind = readString(query, 'kind');

    const filtered = db.bankAccounts.filter((account) => {
      if (status && account.status !== status) return false;
      if (kind && account.kind !== kind) return false;
      return matchesSearch(search, [account.name, account.accountNumber, account.bankName, account.holderName]);
    });

    const sorted = sortRecords(
      filtered,
      readString(query, 'sortBy') ?? 'name',
      (readString(query, 'sortDir') as 'asc' | 'desc') ?? 'asc',
      (account, field) => (account as unknown as Record<string, string | number>)[field] ?? account.name,
    );
    return paginate(sorted, query);
  }),

  route('GET', '/bank-accounts/options', ({ db }) =>
    db.bankAccounts
      .filter((account) => account.status === 'Active')
      .map<SelectOption>((account) => ({
        value: account.id,
        label: account.name,
        description: account.accountNumber,
      })),
  ),

  route('GET', '/bank-accounts/summary', ({ db }) => {
    const month = TODAY.slice(0, 7);
    const monthly = db.cashTransactions.filter((transaction) => transaction.date.startsWith(month));
    return {
      accountCount: db.bankAccounts.length,
      totalBalance: db.bankAccounts.reduce((sum, account) => sum + account.currentBalance, 0),
      bankBalance: db.bankAccounts
        .filter((account) => account.kind === 'Bank')
        .reduce((sum, account) => sum + account.currentBalance, 0),
      cashBalance: db.bankAccounts
        .filter((account) => account.kind === 'Cash')
        .reduce((sum, account) => sum + account.currentBalance, 0),
      monthInflow: monthly
        .filter((transaction) => transaction.type === 'Income')
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      monthOutflow: monthly
        .filter((transaction) => transaction.type === 'Expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    };
  }),

  route('GET', '/bank-accounts/:id', ({ db, params }) => {
    const account = db.bankAccounts.find((entry) => entry.id === params.id);
    if (!account) throw new ApiError(404, 'Rekening tidak ditemukan');
    return account;
  }),

  route('POST', '/bank-accounts', ({ db, body }) => {
    const payload = body as Partial<BankAccount>;
    const glAccount = db.accounts.find((entry) => entry.id === payload.glAccountId);
    const created: BankAccount = {
      id: `bank-new-${db.bankAccounts.length + 1}`,
      name: payload.name ?? '',
      accountNumber: payload.accountNumber ?? '',
      bankName: payload.bankName ?? '',
      branch: payload.branch ?? '',
      holderName: payload.holderName ?? '',
      glAccountId: glAccount?.id ?? '',
      glAccountCode: glAccount?.code ?? '',
      currency: payload.currency ?? 'IDR',
      openingBalance: Number(payload.openingBalance ?? 0),
      currentBalance: Number(payload.openingBalance ?? 0),
      kind: payload.kind ?? 'Bank',
      status: payload.status ?? 'Active',
      createdAt: new Date().toISOString(),
      createdBy: db.currentUser.name,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.bankAccounts.push(created);
    return created;
  }),

  route('PUT', '/bank-accounts/:id', ({ db, params, body }) => {
    const index = db.bankAccounts.findIndex((entry) => entry.id === params.id);
    if (index === -1) throw new ApiError(404, 'Rekening tidak ditemukan');
    const updated = {
      ...db.bankAccounts[index]!,
      ...(body as Partial<BankAccount>),
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.bankAccounts[index] = updated;
    return updated;
  }),

  route('PATCH', '/bank-accounts/:id/status', ({ db, params, body }) => {
    const account = db.bankAccounts.find((entry) => entry.id === params.id);
    if (!account) throw new ApiError(404, 'Rekening tidak ditemukan');
    account.status = (body as { status: 'Active' | 'Inactive' }).status;
    return account;
  }),

  route('GET', '/cash-transactions', ({ db, query }) => {
    const search = readString(query, 'search');
    const type = readString(query, 'type');
    const bankAccountId = readString(query, 'bankAccountId');
    const reconciled = readString(query, 'reconciled');
    const from = readString(query, 'from');
    const to = readString(query, 'to');

    const filtered = db.cashTransactions.filter((transaction) => {
      if (type && transaction.type !== type) return false;
      if (bankAccountId && transaction.bankAccountId !== bankAccountId) return false;
      if (reconciled === 'true' && !transaction.reconciled) return false;
      if (reconciled === 'false' && transaction.reconciled) return false;
      if (!withinRange(transaction.date, from, to)) return false;
      return matchesSearch(search, [
        transaction.reference,
        transaction.description,
        transaction.bankAccountName,
        transaction.counterAccountName,
      ]);
    });

    const sorted = sortRecords(
      filtered,
      readString(query, 'sortBy') ?? 'date',
      (readString(query, 'sortDir') as 'asc' | 'desc') ?? 'desc',
      (transaction, field) => (transaction as unknown as Record<string, string | number>)[field] ?? transaction.date,
    );

    const page = paginate(sorted, query);
    return {
      ...page,
      totals: {
        income: filtered
          .filter((transaction) => transaction.type === 'Income')
          .reduce((sum, transaction) => sum + transaction.amount, 0),
        expense: filtered
          .filter((transaction) => transaction.type === 'Expense')
          .reduce((sum, transaction) => sum + transaction.amount, 0),
        transfer: filtered
          .filter((transaction) => transaction.type === 'Transfer')
          .reduce((sum, transaction) => sum + transaction.amount, 0),
      },
    };
  }),

  route('POST', '/cash-transactions', ({ db, body }) => {
    const payload = body as {
      date: string;
      reference: string;
      description: string;
      bankAccountId: string;
      counterAccountId: string;
      type: CashTransaction['type'];
      amount: number;
      transferToAccountId?: string;
    };
    const bank = db.bankAccounts.find((entry) => entry.id === payload.bankAccountId);
    if (!bank) throw new ApiError(422, 'Rekening kas wajib dipilih', 'ACCOUNT_REQUIRED');
    const counter = db.accounts.find((entry) => entry.id === payload.counterAccountId);
    const target = payload.transferToAccountId
      ? db.bankAccounts.find((entry) => entry.id === payload.transferToAccountId)
      : null;

    const created: CashTransaction = {
      id: `cash-new-${db.cashTransactions.length + 1}`,
      date: payload.date,
      reference: payload.reference,
      description: payload.description,
      bankAccountId: bank.id,
      bankAccountName: bank.name,
      counterAccountId: counter?.id ?? '',
      counterAccountName: counter ? `${counter.code} · ${counter.name}` : (target?.name ?? '—'),
      type: payload.type,
      amount: Number(payload.amount),
      runningBalance: bank.currentBalance + (payload.type === 'Income' ? payload.amount : -payload.amount),
      reconciled: false,
      transferToAccountId: target?.id ?? null,
      transferToAccountName: target?.name ?? null,
      createdBy: db.currentUser.name,
    };

    bank.currentBalance = created.runningBalance;
    if (target) target.currentBalance += Number(payload.amount);
    db.cashTransactions.unshift(created);
    return created;
  }),

  route('PATCH', '/cash-transactions/:id/reconcile', ({ db, params, body }) => {
    const transaction = db.cashTransactions.find((entry) => entry.id === params.id);
    if (!transaction) throw new ApiError(404, 'Transaksi tidak ditemukan');
    transaction.reconciled = (body as { reconciled: boolean }).reconciled;
    return transaction;
  }),

  route('GET', '/reconciliation', ({ db, query }): ReconciliationSession => {
    const bankAccountId = readString(query, 'bankAccountId') ?? db.bankAccounts[0]!.id;
    const from = readString(query, 'from') ?? `${TODAY.slice(0, 7)}-01`;
    const to = readString(query, 'to') ?? TODAY;
    const bank = db.bankAccounts.find((entry) => entry.id === bankAccountId);
    if (!bank) throw new ApiError(404, 'Rekening tidak ditemukan');

    const rng = createRng(bank.id.length * 977 + from.length * 31);
    const inPeriod = db.cashTransactions
      .filter((transaction) => transaction.bankAccountId === bank.id)
      .filter((transaction) => withinRange(transaction.date, from, to))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const matched: ReconciliationMatch[] = [];
    const unmatchedTransactions: CashTransaction[] = [];

    inPeriod.forEach((transaction, index) => {
      const isMatched = index % 7 !== 5 && index % 11 !== 9;
      if (!isMatched) {
        unmatchedTransactions.push(transaction);
        return;
      }
      const isInflow = transaction.type === 'Income';
      matched.push({
        id: `match-${transaction.id}`,
        statementLine: {
          id: `stm-${transaction.id}`,
          date: transaction.date,
          description: transaction.description,
          reference: transaction.reference,
          debit: isInflow ? transaction.amount : 0,
          credit: isInflow ? 0 : transaction.amount,
        },
        transaction,
        matchedAt: `${transaction.date}T10:00:00.000Z`,
        confidence: index % 6 === 0 ? 'Suggested' : 'Exact',
      });
    });

    const unmatchedStatementLines: StatementLine[] = Array.from({ length: 4 }, (_, index) => {
      const inflow = rng.bool(0.4);
      const amount = rng.amount(1_500_000, 48_000_000, 50_000);
      return {
        id: `stm-extra-${bank.id}-${index + 1}`,
        date: `${to.slice(0, 8)}${String(Math.max(1, rng.int(1, Number(to.slice(8, 10)))))
          .padStart(2, '0')}`,
        description: rng.pick([
          'Biaya administrasi rekening koran',
          'Penerimaan transfer belum teridentifikasi',
          'Pendebetan biaya transfer RTGS',
          'Jasa giro bulan berjalan',
          'Setoran kliring dalam proses',
        ]),
        reference: `STM-${String(rng.int(100000, 999999))}`,
        debit: inflow ? amount : 0,
        credit: inflow ? 0 : amount,
      };
    });

    const systemBalance = bank.currentBalance;
    const statementAdjustment = unmatchedStatementLines.reduce(
      (sum, line) => sum + line.debit - line.credit,
      0,
    );
    const unmatchedAdjustment = unmatchedTransactions.reduce(
      (sum, transaction) => sum + (transaction.type === 'Income' ? transaction.amount : -transaction.amount),
      0,
    );
    const statementBalance = systemBalance + statementAdjustment - unmatchedAdjustment;

    return {
      id: `recon-${bank.id}-${from}`,
      bankAccountId: bank.id,
      bankAccountName: bank.name,
      periodFrom: from,
      periodTo: to,
      statementBalance,
      systemBalance,
      difference: statementBalance - systemBalance,
      status: unmatchedStatementLines.length || unmatchedTransactions.length ? 'In Progress' : 'Completed',
      matched,
      unmatchedStatementLines,
      unmatchedTransactions,
    };
  }),
];
