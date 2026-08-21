import type {
  Account,
  GeneralLedgerResult,
  JournalEntry,
  JournalLine,
  SelectOption,
  TrialBalanceResult,
  TrialBalanceRow,
} from '@/types';
import { ApiError } from '@/lib/api-error';
import { TODAY } from '@/utils/date';
import { matchesSearch, paginate, readString, sortRecords, withinRange } from '../query';
import { route, type Route, type RouteContext } from '../router';

type AccountSort = keyof Pick<Account, 'code' | 'name' | 'type' | 'balance' | 'status'> | 'parentName';

function accountValue(account: Account, field: string): string | number | null {
  switch (field as AccountSort) {
    case 'code':
      return account.code;
    case 'name':
      return account.name;
    case 'type':
      return account.type;
    case 'balance':
      return account.balance;
    case 'status':
      return account.status;
    case 'parentName':
      return account.parentName;
    default:
      return account.code;
  }
}

function filterAccounts({ db, query }: RouteContext): Account[] {
  const search = readString(query, 'search');
  const type = readString(query, 'type');
  const status = readString(query, 'status');
  const parentId = readString(query, 'parentId');

  return db.accounts.filter((account) => {
    if (type && account.type !== type) return false;
    if (status && account.status !== status) return false;
    if (parentId && account.parentId !== parentId) return false;
    return matchesSearch(search, [account.code, account.name, account.type, account.parentName]);
  });
}

function nextJournalNumber(db: { journals: JournalEntry[] }): string {
  const year = TODAY.slice(0, 4);
  const highest = db.journals.reduce((max, journal) => {
    const parsed = Number(journal.number.split('-')[2] ?? 0);
    return parsed > max ? parsed : max;
  }, 0);
  return `JE-${year}-${String(highest + 1).padStart(5, '0')}`;
}

function normaliseJournalLines(
  accounts: Account[],
  lines: { accountId: string; description?: string; debit?: number; credit?: number }[],
  journalId: string,
): JournalLine[] {
  return lines.map((line, index) => {
    const account = accounts.find((entry) => entry.id === line.accountId);
    if (!account) throw new ApiError(422, `Akun tidak ditemukan pada baris ${index + 1}`, 'INVALID_ACCOUNT');
    return {
      id: `${journalId}-${index + 1}`,
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      description: line.description ?? '',
      debit: Number(line.debit ?? 0),
      credit: Number(line.credit ?? 0),
    };
  });
}

export const accountingRoutes: Route[] = [
  route('GET', '/accounts', (context) => {
    const { query } = context;
    const filtered = filterAccounts(context);
    const sorted = sortRecords(
      filtered,
      readString(query, 'sortBy') ?? 'code',
      (readString(query, 'sortDir') as 'asc' | 'desc') ?? 'asc',
      accountValue,
    );
    return paginate(sorted, query);
  }),

  route('GET', '/accounts/options', ({ db, query }) => {
    const includeInactive = readString(query, 'includeInactive') === 'true';
    const postableOnly = readString(query, 'postableOnly') !== 'false';
    const parents = new Set(db.accounts.map((account) => account.parentCode).filter(Boolean));

    return db.accounts
      .filter((account) => (includeInactive ? true : account.status === 'Active'))
      .filter((account) => (postableOnly ? !parents.has(account.code) : true))
      .map<SelectOption>((account) => ({
        value: account.id,
        label: `${account.code} · ${account.name}`,
        description: account.type,
      }));
  }),

  route('GET', '/accounts/summary', ({ db }) => {
    const leaf = db.accounts.filter(
      (account) => !db.accounts.some((child) => child.parentCode === account.code),
    );
    return {
      total: db.accounts.length,
      active: db.accounts.filter((account) => account.status === 'Active').length,
      inactive: db.accounts.filter((account) => account.status === 'Inactive').length,
      byType: (['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as const).map((type) => ({
        type,
        count: db.accounts.filter((account) => account.type === type).length,
        balance: leaf.filter((account) => account.type === type).reduce((sum, account) => sum + account.balance, 0),
      })),
    };
  }),

  route('GET', '/accounts/:id', ({ db, params }) => {
    const account = db.accounts.find((entry) => entry.id === params.id);
    if (!account) throw new ApiError(404, 'Akun tidak ditemukan');
    const children = db.accounts.filter((entry) => entry.parentId === account.id);
    const movements = db.journals
      .filter((journal) => journal.status === 'Posted')
      .flatMap((journal) =>
        journal.lines
          .filter((line) => line.accountId === account.id)
          .map((line) => ({
            id: line.id,
            date: journal.date,
            journalId: journal.id,
            journalNumber: journal.number,
            memo: journal.memo,
            debit: line.debit,
            credit: line.credit,
          })),
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 12);
    return { account, children, movements };
  }),

  route('POST', '/accounts', ({ db, body }) => {
    const payload = body as Partial<Account> & { code: string; name: string };
    if (db.accounts.some((account) => account.code === payload.code)) {
      throw new ApiError(422, 'Kode akun sudah digunakan', 'DUPLICATE_CODE', {
        code: ['Kode akun sudah digunakan oleh akun lain'],
      });
    }
    const parent = payload.parentId ? db.accounts.find((entry) => entry.id === payload.parentId) : undefined;
    const created: Account = {
      id: `acc-${payload.code}`,
      code: payload.code,
      name: payload.name,
      type: payload.type ?? 'Asset',
      subtype: payload.subtype ?? 'Current Asset',
      parentId: parent?.id ?? null,
      parentCode: parent?.code ?? null,
      parentName: parent?.name ?? null,
      normalBalance: payload.type === 'Liability' || payload.type === 'Equity' || payload.type === 'Revenue' ? 'Credit' : 'Debit',
      balance: Number(payload.openingBalance ?? 0),
      openingBalance: Number(payload.openingBalance ?? 0),
      status: payload.status ?? 'Active',
      isSystem: false,
      description: payload.description ?? '',
      level: parent ? parent.level + 1 : 0,
      createdAt: new Date().toISOString(),
      createdBy: db.currentUser.name,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.accounts.push(created);
    return created;
  }),

  route('PUT', '/accounts/:id', ({ db, params, body }) => {
    const index = db.accounts.findIndex((entry) => entry.id === params.id);
    if (index === -1) throw new ApiError(404, 'Akun tidak ditemukan');
    const payload = body as Partial<Account>;
    const parent = payload.parentId ? db.accounts.find((entry) => entry.id === payload.parentId) : null;
    const updated: Account = {
      ...db.accounts[index]!,
      ...payload,
      parentId: parent?.id ?? null,
      parentCode: parent?.code ?? null,
      parentName: parent?.name ?? null,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.accounts[index] = updated;
    return updated;
  }),

  route('PATCH', '/accounts/:id/status', ({ db, params, body }) => {
    const account = db.accounts.find((entry) => entry.id === params.id);
    if (!account) throw new ApiError(404, 'Akun tidak ditemukan');
    if (account.isSystem) {
      throw new ApiError(422, 'Akun sistem tidak dapat dinonaktifkan', 'SYSTEM_ACCOUNT');
    }
    account.status = (body as { status: 'Active' | 'Inactive' }).status;
    account.updatedAt = new Date().toISOString();
    account.updatedBy = db.currentUser.name;
    return account;
  }),

  route('DELETE', '/accounts/:id', ({ db, params }) => {
    const account = db.accounts.find((entry) => entry.id === params.id);
    if (!account) throw new ApiError(404, 'Akun tidak ditemukan');
    if (account.isSystem) throw new ApiError(422, 'Akun sistem tidak dapat dihapus', 'SYSTEM_ACCOUNT');
    const used = db.journals.some((journal) => journal.lines.some((line) => line.accountId === account.id));
    if (used) throw new ApiError(422, 'Akun sudah memiliki transaksi dan tidak dapat dihapus', 'ACCOUNT_IN_USE');
    db.accounts = db.accounts.filter((entry) => entry.id !== account.id);
    return { success: true };
  }),

  route('GET', '/journals', ({ db, query }) => {
    const search = readString(query, 'search');
    const status = readString(query, 'status');
    const source = readString(query, 'source');
    const from = readString(query, 'from');
    const to = readString(query, 'to');

    const filtered = db.journals.filter((journal) => {
      if (status && journal.status !== status) return false;
      if (source && journal.source !== source) return false;
      if (!withinRange(journal.date, from, to)) return false;
      return matchesSearch(search, [
        journal.number,
        journal.reference,
        journal.memo,
        journal.source,
        ...journal.lines.map((line) => line.accountName),
      ]);
    });

    const sorted = sortRecords(
      filtered,
      readString(query, 'sortBy') ?? 'date',
      (readString(query, 'sortDir') as 'asc' | 'desc') ?? 'desc',
      (journal, field) => {
        if (field === 'number') return journal.number;
        if (field === 'totalDebit') return journal.totalDebit;
        if (field === 'status') return journal.status;
        if (field === 'source') return journal.source;
        return journal.date;
      },
    );
    return paginate(sorted, query);
  }),

  route('GET', '/journals/summary', ({ db }) => {
    const month = TODAY.slice(0, 7);
    const thisMonth = db.journals.filter((journal) => journal.date.startsWith(month));
    return {
      total: db.journals.length,
      draft: db.journals.filter((journal) => journal.status === 'Draft').length,
      posted: db.journals.filter((journal) => journal.status === 'Posted').length,
      void: db.journals.filter((journal) => journal.status === 'Void').length,
      thisMonthCount: thisMonth.length,
      thisMonthValue: thisMonth
        .filter((journal) => journal.status === 'Posted')
        .reduce((sum, journal) => sum + journal.totalDebit, 0),
    };
  }),

  route('GET', '/journals/:id', ({ db, params }) => {
    const journal = db.journals.find((entry) => entry.id === params.id);
    if (!journal) throw new ApiError(404, 'Jurnal tidak ditemukan');
    return journal;
  }),

  route('POST', '/journals', ({ db, body }) => {
    const payload = body as {
      date: string;
      reference: string;
      memo: string;
      status?: 'Draft' | 'Posted';
      lines: { accountId: string; description?: string; debit?: number; credit?: number }[];
    };
    const id = `je-new-${db.journals.length + 1}`;
    const lines = normaliseJournalLines(db.accounts, payload.lines, id);
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
    if (totalDebit !== totalCredit) {
      throw new ApiError(422, 'Total debit dan kredit harus seimbang', 'UNBALANCED_JOURNAL');
    }

    const created: JournalEntry = {
      id,
      number: nextJournalNumber(db),
      date: payload.date,
      reference: payload.reference,
      memo: payload.memo,
      source: 'Manual',
      status: payload.status ?? 'Draft',
      lines,
      totalDebit,
      totalCredit,
      postedAt: payload.status === 'Posted' ? new Date().toISOString() : null,
      postedBy: payload.status === 'Posted' ? db.currentUser.name : null,
      createdAt: new Date().toISOString(),
      createdBy: db.currentUser.name,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.journals.unshift(created);
    return created;
  }),

  route('PUT', '/journals/:id', ({ db, params, body }) => {
    const index = db.journals.findIndex((entry) => entry.id === params.id);
    if (index === -1) throw new ApiError(404, 'Jurnal tidak ditemukan');
    const existing = db.journals[index]!;
    if (existing.status !== 'Draft') {
      throw new ApiError(422, 'Hanya jurnal berstatus draft yang dapat diubah', 'JOURNAL_LOCKED');
    }
    const payload = body as {
      date: string;
      reference: string;
      memo: string;
      status?: 'Draft' | 'Posted';
      lines: { accountId: string; description?: string; debit?: number; credit?: number }[];
    };
    const lines = normaliseJournalLines(db.accounts, payload.lines, existing.id);
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
    if (totalDebit !== totalCredit) {
      throw new ApiError(422, 'Total debit dan kredit harus seimbang', 'UNBALANCED_JOURNAL');
    }
    const updated: JournalEntry = {
      ...existing,
      date: payload.date,
      reference: payload.reference,
      memo: payload.memo,
      status: payload.status ?? existing.status,
      lines,
      totalDebit,
      totalCredit,
      postedAt: payload.status === 'Posted' ? new Date().toISOString() : existing.postedAt,
      postedBy: payload.status === 'Posted' ? db.currentUser.name : existing.postedBy,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.journals[index] = updated;
    return updated;
  }),

  route('PATCH', '/journals/:id/post', ({ db, params }) => {
    const journal = db.journals.find((entry) => entry.id === params.id);
    if (!journal) throw new ApiError(404, 'Jurnal tidak ditemukan');
    if (journal.status !== 'Draft') throw new ApiError(422, 'Jurnal ini sudah diposting', 'ALREADY_POSTED');
    journal.status = 'Posted';
    journal.postedAt = new Date().toISOString();
    journal.postedBy = db.currentUser.name;
    return journal;
  }),

  route('PATCH', '/journals/:id/void', ({ db, params }) => {
    const journal = db.journals.find((entry) => entry.id === params.id);
    if (!journal) throw new ApiError(404, 'Jurnal tidak ditemukan');
    journal.status = 'Void';
    journal.updatedAt = new Date().toISOString();
    journal.updatedBy = db.currentUser.name;
    return journal;
  }),

  route('DELETE', '/journals/:id', ({ db, params }) => {
    const journal = db.journals.find((entry) => entry.id === params.id);
    if (!journal) throw new ApiError(404, 'Jurnal tidak ditemukan');
    if (journal.status === 'Posted') {
      throw new ApiError(422, 'Jurnal yang sudah diposting tidak dapat dihapus', 'JOURNAL_LOCKED');
    }
    db.journals = db.journals.filter((entry) => entry.id !== journal.id);
    return { success: true };
  }),

  route('GET', '/general-ledger', ({ db, query }): GeneralLedgerResult => {
    const accountId = readString(query, 'accountId');
    const from = readString(query, 'from');
    const to = readString(query, 'to') ?? TODAY;
    const search = readString(query, 'search');

    const account = db.accounts.find((entry) => entry.id === accountId) ?? db.accounts[0]!;
    const sign = account.normalBalance === 'Debit' ? 1 : -1;

    const allLines = db.journals
      .filter((journal) => journal.status === 'Posted')
      .flatMap((journal) =>
        journal.lines
          .filter((line) => line.accountId === account.id)
          .map((line) => ({ journal, line })),
      )
      .sort((a, b) => (a.journal.date === b.journal.date
        ? a.journal.number.localeCompare(b.journal.number)
        : a.journal.date < b.journal.date ? -1 : 1));

    let openingBalance = 0;
    const inPeriod: typeof allLines = [];
    for (const item of allLines) {
      if (from && item.journal.date < from) {
        openingBalance += sign * (item.line.debit - item.line.credit);
        continue;
      }
      if (item.journal.date > to) continue;
      inPeriod.push(item);
    }

    let running = openingBalance;
    const entries = inPeriod.map(({ journal, line }) => {
      running += sign * (line.debit - line.credit);
      return {
        id: line.id,
        date: journal.date,
        journalNumber: journal.number,
        journalId: journal.id,
        reference: journal.reference,
        description: line.description || journal.memo,
        source: journal.source,
        debit: line.debit,
        credit: line.credit,
        runningBalance: running,
      };
    });

    const visible = entries.filter((entry) =>
      matchesSearch(search, [entry.journalNumber, entry.reference, entry.description, entry.source]),
    );

    return {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      normalBalance: account.normalBalance,
      openingBalance,
      closingBalance: running,
      totalDebit: inPeriod.reduce((sum, item) => sum + item.line.debit, 0),
      totalCredit: inPeriod.reduce((sum, item) => sum + item.line.credit, 0),
      entries: visible.reverse(),
    };
  }),

  route('GET', '/trial-balance', ({ db, query }): TrialBalanceResult => {
    const asOf = readString(query, 'to') ?? TODAY;
    const from = readString(query, 'from');
    const includeZero = readString(query, 'includeZero') === 'true';

    const movement = new Map<string, number>();
    for (const journal of db.journals) {
      if (journal.status !== 'Posted') continue;
      if (journal.date > asOf) continue;
      if (from && journal.date < from) continue;
      for (const line of journal.lines) {
        movement.set(line.accountId, (movement.get(line.accountId) ?? 0) + (line.debit - line.credit));
      }
    }

    const leafAccounts = db.accounts.filter(
      (account) => !db.accounts.some((child) => child.parentCode === account.code),
    );

    const rows: TrialBalanceRow[] = leafAccounts
      .map((account) => {
        const net = movement.get(account.id) ?? 0;
        return {
          accountId: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          debit: net > 0 ? net : 0,
          credit: net < 0 ? -net : 0,
        };
      })
      .filter((row) => includeZero || row.debit !== 0 || row.credit !== 0)
      .sort((a, b) => a.code.localeCompare(b.code));

    return {
      rows,
      totalDebit: rows.reduce((sum, row) => sum + row.debit, 0),
      totalCredit: rows.reduce((sum, row) => sum + row.credit, 0),
      asOf,
    };
  }),
];
