import type {
  AgingBucketSet,
  ArAgingReport,
  ArAgingRow,
  Customer,
  Invoice,
  InvoiceItem,
  SelectOption,
} from '@/types';
import { ApiError } from '@/lib/api-error';
import { TODAY, daysBetween } from '@/utils/date';
import { matchesSearch, paginate, readString, sortRecords, withinRange } from '../query';
import { route, type Route } from '../router';

const emptyBuckets = (): AgingBucketSet => ({
  current: 0,
  d1to30: 0,
  d31to60: 0,
  d61to90: 0,
  d90plus: 0,
  total: 0,
});

export function addToBucket(buckets: AgingBucketSet, dueDate: string, amount: number, asOf = TODAY): void {
  const overdue = daysBetween(dueDate, asOf);
  if (overdue <= 0) buckets.current += amount;
  else if (overdue <= 30) buckets.d1to30 += amount;
  else if (overdue <= 60) buckets.d31to60 += amount;
  else if (overdue <= 90) buckets.d61to90 += amount;
  else buckets.d90plus += amount;
  buckets.total += amount;
}

function recalcInvoiceTotals(items: InvoiceItem[]): Pick<Invoice, 'subtotal' | 'discountTotal' | 'taxTotal' | 'total'> & {
  items: InvoiceItem[];
} {
  const priced = items.map((item, index) => {
    const gross = item.quantity * item.unitPrice;
    const discount = Math.round((gross * item.discountPercent) / 100);
    return { ...item, id: item.id || `item-${index + 1}`, amount: gross - discount };
  });
  const subtotal = priced.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = priced.reduce(
    (sum, item) => sum + Math.round((item.quantity * item.unitPrice * item.discountPercent) / 100),
    0,
  );
  const taxTotal = priced.reduce((sum, item) => sum + Math.round((item.amount * item.taxPercent) / 100), 0);
  return {
    items: priced,
    subtotal,
    discountTotal,
    taxTotal,
    total: subtotal - discountTotal + taxTotal,
  };
}

export const salesRoutes: Route[] = [
  route('GET', '/customers', ({ db, query }) => {
    const search = readString(query, 'search');
    const status = readString(query, 'status');
    const category = readString(query, 'category');
    const hasOutstanding = readString(query, 'hasOutstanding');

    const filtered = db.customers.filter((customer) => {
      if (status && customer.status !== status) return false;
      if (category && customer.category !== category) return false;
      if (hasOutstanding === 'true' && customer.outstandingBalance <= 0) return false;
      return matchesSearch(search, [
        customer.code,
        customer.name,
        customer.legalName,
        customer.email,
        customer.city,
        customer.contactPerson,
      ]);
    });

    const sorted = sortRecords(
      filtered,
      readString(query, 'sortBy') ?? 'name',
      (readString(query, 'sortDir') as 'asc' | 'desc') ?? 'asc',
      (customer, field) => (customer as unknown as Record<string, string | number>)[field] ?? customer.name,
    );
    return paginate(sorted, query);
  }),

  route('GET', '/customers/options', ({ db }) =>
    db.customers
      .filter((customer) => customer.status === 'Active')
      .map<SelectOption>((customer) => ({
        value: customer.id,
        label: customer.name,
        description: `${customer.code} · Termin ${customer.paymentTermDays} hari`,
      })),
  ),

  route('GET', '/customers/summary', ({ db }) => ({
    total: db.customers.length,
    active: db.customers.filter((customer) => customer.status === 'Active').length,
    outstandingTotal: db.customers.reduce((sum, customer) => sum + customer.outstandingBalance, 0),
    overLimit: db.customers.filter((customer) => customer.outstandingBalance > customer.creditLimit).length,
  })),

  route('GET', '/customers/:id', ({ db, params }) => {
    const customer = db.customers.find((entry) => entry.id === params.id);
    if (!customer) throw new ApiError(404, 'Pelanggan tidak ditemukan');
    return customer;
  }),

  route('GET', '/customers/:id/transactions', ({ db, params }) => {
    const invoices = db.invoices.filter((invoice) => invoice.customerId === params.id);
    const buckets = emptyBuckets();
    invoices
      .filter((invoice) => invoice.outstanding > 0 && invoice.status !== 'Draft' && invoice.status !== 'Cancelled')
      .forEach((invoice) => addToBucket(buckets, invoice.dueDate, invoice.outstanding));

    return {
      invoices: invoices.slice(0, 50),
      payments: invoices
        .flatMap((invoice) =>
          invoice.payments.map((payment) => ({
            ...payment,
            invoiceNumber: invoice.number,
          })),
        )
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 30),
      aging: buckets,
      totals: {
        invoiceCount: invoices.length,
        billed: invoices.reduce((sum, invoice) => sum + invoice.total, 0),
        collected: invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0),
        outstanding: invoices.reduce((sum, invoice) => sum + invoice.outstanding, 0),
      },
    };
  }),

  route('POST', '/customers', ({ db, body }) => {
    const payload = body as Partial<Customer>;
    const created: Customer = {
      id: `cust-new-${db.customers.length + 1}`,
      code: `CUST-${String(db.customers.length + 1).padStart(4, '0')}`,
      name: payload.name ?? '',
      legalName: payload.legalName ?? payload.name ?? '',
      taxId: payload.taxId ?? '',
      email: payload.email ?? '',
      phone: payload.phone ?? '',
      contactPerson: payload.contactPerson ?? '',
      address: payload.address ?? '',
      city: payload.city ?? '',
      province: payload.province ?? '',
      postalCode: payload.postalCode ?? '',
      paymentTermDays: Number(payload.paymentTermDays ?? 30),
      creditLimit: Number(payload.creditLimit ?? 0),
      outstandingBalance: 0,
      totalBilled: 0,
      status: payload.status ?? 'Active',
      category: payload.category ?? 'Corporate',
      notes: payload.notes ?? '',
      createdAt: new Date().toISOString(),
      createdBy: db.currentUser.name,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.customers.unshift(created);
    return created;
  }),

  route('PUT', '/customers/:id', ({ db, params, body }) => {
    const index = db.customers.findIndex((entry) => entry.id === params.id);
    if (index === -1) throw new ApiError(404, 'Pelanggan tidak ditemukan');
    const updated = {
      ...db.customers[index]!,
      ...(body as Partial<Customer>),
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.customers[index] = updated;
    return updated;
  }),

  route('PATCH', '/customers/:id/status', ({ db, params, body }) => {
    const customer = db.customers.find((entry) => entry.id === params.id);
    if (!customer) throw new ApiError(404, 'Pelanggan tidak ditemukan');
    customer.status = (body as { status: 'Active' | 'Inactive' }).status;
    return customer;
  }),

  route('DELETE', '/customers/:id', ({ db, params }) => {
    const hasInvoices = db.invoices.some((invoice) => invoice.customerId === params.id);
    if (hasInvoices) {
      throw new ApiError(422, 'Pelanggan memiliki riwayat faktur dan tidak dapat dihapus', 'CUSTOMER_IN_USE');
    }
    db.customers = db.customers.filter((entry) => entry.id !== params.id);
    return { success: true };
  }),

  route('GET', '/invoices', ({ db, query }) => {
    const search = readString(query, 'search');
    const status = readString(query, 'status');
    const customerId = readString(query, 'customerId');
    const from = readString(query, 'from');
    const to = readString(query, 'to');

    const filtered = db.invoices.filter((invoice) => {
      if (status && invoice.status !== status) return false;
      if (customerId && invoice.customerId !== customerId) return false;
      if (!withinRange(invoice.date, from, to)) return false;
      return matchesSearch(search, [invoice.number, invoice.customerName, invoice.reference]);
    });

    const sorted = sortRecords(
      filtered,
      readString(query, 'sortBy') ?? 'date',
      (readString(query, 'sortDir') as 'asc' | 'desc') ?? 'desc',
      (invoice, field) => (invoice as unknown as Record<string, string | number>)[field] ?? invoice.date,
    );
    return paginate(sorted, query);
  }),

  route('GET', '/invoices/summary', ({ db }) => {
    const live = db.invoices.filter((invoice) => invoice.status !== 'Cancelled' && invoice.status !== 'Draft');
    return {
      count: db.invoices.length,
      draft: db.invoices.filter((invoice) => invoice.status === 'Draft').length,
      overdue: db.invoices.filter((invoice) => invoice.status === 'Overdue').length,
      billed: live.reduce((sum, invoice) => sum + invoice.total, 0),
      collected: live.reduce((sum, invoice) => sum + invoice.paidAmount, 0),
      outstanding: live.reduce((sum, invoice) => sum + invoice.outstanding, 0),
      overdueValue: db.invoices
        .filter((invoice) => invoice.status === 'Overdue')
        .reduce((sum, invoice) => sum + invoice.outstanding, 0),
    };
  }),

  route('GET', '/invoices/:id', ({ db, params }) => {
    const invoice = db.invoices.find((entry) => entry.id === params.id);
    if (!invoice) throw new ApiError(404, 'Faktur tidak ditemukan');
    return invoice;
  }),

  route('POST', '/invoices', ({ db, body }) => {
    const payload = body as Partial<Invoice> & { items: InvoiceItem[]; customerId: string };
    const customer = db.customers.find((entry) => entry.id === payload.customerId);
    if (!customer) throw new ApiError(422, 'Pelanggan wajib dipilih', 'CUSTOMER_REQUIRED');
    const totals = recalcInvoiceTotals(payload.items ?? []);
    const sequence = db.invoices.length + 1;
    const created: Invoice = {
      id: `inv-new-${sequence}`,
      number: `INV-${(payload.date ?? TODAY).slice(0, 4)}-${String(sequence).padStart(4, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      date: payload.date ?? TODAY,
      dueDate: payload.dueDate ?? TODAY,
      reference: payload.reference ?? '',
      terms: payload.terms ?? `Net ${customer.paymentTermDays} hari sejak tanggal faktur`,
      notes: payload.notes ?? '',
      ...totals,
      paidAmount: 0,
      outstanding: totals.total,
      status: payload.status ?? 'Draft',
      payments: [],
      createdAt: new Date().toISOString(),
      createdBy: db.currentUser.name,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.invoices.unshift(created);
    return created;
  }),

  route('PUT', '/invoices/:id', ({ db, params, body }) => {
    const index = db.invoices.findIndex((entry) => entry.id === params.id);
    if (index === -1) throw new ApiError(404, 'Faktur tidak ditemukan');
    const existing = db.invoices[index]!;
    const payload = body as Partial<Invoice> & { items?: InvoiceItem[] };
    const totals = recalcInvoiceTotals(payload.items ?? existing.items);
    const customer = payload.customerId
      ? db.customers.find((entry) => entry.id === payload.customerId)
      : undefined;
    const updated: Invoice = {
      ...existing,
      ...payload,
      customerId: customer?.id ?? existing.customerId,
      customerName: customer?.name ?? existing.customerName,
      ...totals,
      outstanding: totals.total - existing.paidAmount,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.invoices[index] = updated;
    return updated;
  }),

  route('PATCH', '/invoices/:id/status', ({ db, params, body }) => {
    const invoice = db.invoices.find((entry) => entry.id === params.id);
    if (!invoice) throw new ApiError(404, 'Faktur tidak ditemukan');
    invoice.status = (body as { status: Invoice['status'] }).status;
    if (invoice.status === 'Cancelled') invoice.outstanding = 0;
    invoice.updatedAt = new Date().toISOString();
    invoice.updatedBy = db.currentUser.name;
    return invoice;
  }),

  route('POST', '/invoices/:id/payments', ({ db, params, body }) => {
    const invoice = db.invoices.find((entry) => entry.id === params.id);
    if (!invoice) throw new ApiError(404, 'Faktur tidak ditemukan');
    const payload = body as { date: string; amount: number; method: string; accountName: string; reference: string };
    if (payload.amount <= 0) throw new ApiError(422, 'Nilai pembayaran harus lebih besar dari nol', 'INVALID_AMOUNT');
    if (payload.amount > invoice.outstanding) {
      throw new ApiError(422, 'Nilai pembayaran melebihi sisa tagihan', 'OVERPAYMENT');
    }
    invoice.payments.push({
      id: `${invoice.id}-pay-${invoice.payments.length + 1}`,
      date: payload.date,
      amount: payload.amount,
      method: payload.method as Invoice['payments'][number]['method'],
      accountName: payload.accountName,
      reference: payload.reference,
    });
    invoice.paidAmount += payload.amount;
    invoice.outstanding = invoice.total - invoice.paidAmount;
    invoice.status = invoice.outstanding === 0 ? 'Paid' : 'Partially Paid';
    return invoice;
  }),

  route('DELETE', '/invoices/:id', ({ db, params }) => {
    const invoice = db.invoices.find((entry) => entry.id === params.id);
    if (!invoice) throw new ApiError(404, 'Faktur tidak ditemukan');
    if (invoice.status !== 'Draft') {
      throw new ApiError(422, 'Hanya faktur draft yang dapat dihapus', 'INVOICE_LOCKED');
    }
    db.invoices = db.invoices.filter((entry) => entry.id !== invoice.id);
    return { success: true };
  }),

  route('GET', '/reports/ar-aging', ({ db, query }): ArAgingReport => {
    const asOf = readString(query, 'asOf') ?? TODAY;
    const search = readString(query, 'search');
    const rows: ArAgingRow[] = [];

    for (const customer of db.customers) {
      const open = db.invoices.filter(
        (invoice) =>
          invoice.customerId === customer.id &&
          invoice.outstanding > 0 &&
          invoice.status !== 'Draft' &&
          invoice.status !== 'Cancelled' &&
          invoice.date <= asOf,
      );
      if (!open.length) continue;
      const buckets = emptyBuckets();
      open.forEach((invoice) => addToBucket(buckets, invoice.dueDate, invoice.outstanding, asOf));
      const oldest = Math.max(...open.map((invoice) => daysBetween(invoice.dueDate, asOf)), 0);
      rows.push({
        ...buckets,
        partyId: customer.id,
        partyCode: customer.code,
        partyName: customer.name,
        invoiceCount: open.length,
        oldestInvoiceDays: oldest,
      });
    }

    const visible = rows
      .filter((row) => matchesSearch(search, [row.partyCode, row.partyName]))
      .sort((a, b) => b.total - a.total);

    const totals = visible.reduce((accumulator, row) => {
      accumulator.current += row.current;
      accumulator.d1to30 += row.d1to30;
      accumulator.d31to60 += row.d31to60;
      accumulator.d61to90 += row.d61to90;
      accumulator.d90plus += row.d90plus;
      accumulator.total += row.total;
      return accumulator;
    }, emptyBuckets());

    return { asOf, rows: visible, totals };
  }),
];
