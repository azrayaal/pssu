import type {
  AgingBucketSet,
  ApAgingReport,
  ApAgingRow,
  PurchaseInvoice,
  PurchaseLineItem,
  PurchaseOrder,
  SelectOption,
  Vendor,
} from '@/types';
import { ApiError } from '@/lib/api-error';
import { TODAY, daysBetween } from '@/utils/date';
import { matchesSearch, paginate, readString, sortRecords, withinRange } from '../query';
import { route, type Route } from '../router';
import { addToBucket } from './sales';

const emptyBuckets = (): AgingBucketSet => ({
  current: 0,
  d1to30: 0,
  d31to60: 0,
  d61to90: 0,
  d90plus: 0,
  total: 0,
});

function recalcTotals(items: PurchaseLineItem[]) {
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
  return { items: priced, subtotal, discountTotal, taxTotal, total: subtotal - discountTotal + taxTotal };
}

export const purchaseRoutes: Route[] = [
  route('GET', '/vendors', ({ db, query }) => {
    const search = readString(query, 'search');
    const status = readString(query, 'status');
    const category = readString(query, 'category');

    const filtered = db.vendors.filter((vendor) => {
      if (status && vendor.status !== status) return false;
      if (category && vendor.category !== category) return false;
      return matchesSearch(search, [vendor.code, vendor.name, vendor.legalName, vendor.email, vendor.city]);
    });

    const sorted = sortRecords(
      filtered,
      readString(query, 'sortBy') ?? 'name',
      (readString(query, 'sortDir') as 'asc' | 'desc') ?? 'asc',
      (vendor, field) => (vendor as unknown as Record<string, string | number>)[field] ?? vendor.name,
    );
    return paginate(sorted, query);
  }),

  route('GET', '/vendors/options', ({ db }) =>
    db.vendors
      .filter((vendor) => vendor.status === 'Active')
      .map<SelectOption>((vendor) => ({
        value: vendor.id,
        label: vendor.name,
        description: `${vendor.code} · Termin ${vendor.paymentTermDays} hari`,
      })),
  ),

  route('GET', '/vendors/summary', ({ db }) => ({
    total: db.vendors.length,
    active: db.vendors.filter((vendor) => vendor.status === 'Active').length,
    outstandingTotal: db.vendors.reduce((sum, vendor) => sum + vendor.outstandingBalance, 0),
    purchasedTotal: db.vendors.reduce((sum, vendor) => sum + vendor.totalPurchased, 0),
  })),

  route('GET', '/vendors/:id', ({ db, params }) => {
    const vendor = db.vendors.find((entry) => entry.id === params.id);
    if (!vendor) throw new ApiError(404, 'Pemasok tidak ditemukan');
    return vendor;
  }),

  route('GET', '/vendors/:id/transactions', ({ db, params }) => {
    const bills = db.purchaseInvoices.filter((bill) => bill.vendorId === params.id);
    const orders = db.purchaseOrders.filter((order) => order.vendorId === params.id);
    const buckets = emptyBuckets();
    bills
      .filter((bill) => bill.outstanding > 0)
      .forEach((bill) => addToBucket(buckets, bill.dueDate, bill.outstanding));

    return {
      bills: bills.slice(0, 50),
      orders: orders.slice(0, 50),
      payments: bills
        .flatMap((bill) => bill.payments.map((payment) => ({ ...payment, billNumber: bill.number })))
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 30),
      aging: buckets,
      totals: {
        billCount: bills.length,
        orderCount: orders.length,
        purchased: bills.reduce((sum, bill) => sum + bill.total, 0),
        paid: bills.reduce((sum, bill) => sum + bill.paidAmount, 0),
        outstanding: bills.reduce((sum, bill) => sum + bill.outstanding, 0),
      },
    };
  }),

  route('POST', '/vendors', ({ db, body }) => {
    const payload = body as Partial<Vendor>;
    const created: Vendor = {
      id: `vend-new-${db.vendors.length + 1}`,
      code: `VEND-${String(db.vendors.length + 1).padStart(4, '0')}`,
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
      bankName: payload.bankName ?? '',
      bankAccount: payload.bankAccount ?? '',
      outstandingBalance: 0,
      totalPurchased: 0,
      status: payload.status ?? 'Active',
      category: payload.category ?? 'Goods',
      notes: payload.notes ?? '',
      createdAt: new Date().toISOString(),
      createdBy: db.currentUser.name,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.vendors.unshift(created);
    return created;
  }),

  route('PUT', '/vendors/:id', ({ db, params, body }) => {
    const index = db.vendors.findIndex((entry) => entry.id === params.id);
    if (index === -1) throw new ApiError(404, 'Pemasok tidak ditemukan');
    const updated = {
      ...db.vendors[index]!,
      ...(body as Partial<Vendor>),
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.vendors[index] = updated;
    return updated;
  }),

  route('PATCH', '/vendors/:id/status', ({ db, params, body }) => {
    const vendor = db.vendors.find((entry) => entry.id === params.id);
    if (!vendor) throw new ApiError(404, 'Pemasok tidak ditemukan');
    vendor.status = (body as { status: 'Active' | 'Inactive' }).status;
    return vendor;
  }),

  route('DELETE', '/vendors/:id', ({ db, params }) => {
    const used = db.purchaseInvoices.some((bill) => bill.vendorId === params.id);
    if (used) throw new ApiError(422, 'Pemasok memiliki riwayat transaksi', 'VENDOR_IN_USE');
    db.vendors = db.vendors.filter((entry) => entry.id !== params.id);
    return { success: true };
  }),

  route('GET', '/purchase-orders', ({ db, query }) => {
    const search = readString(query, 'search');
    const status = readString(query, 'status');
    const vendorId = readString(query, 'vendorId');
    const from = readString(query, 'from');
    const to = readString(query, 'to');

    const filtered = db.purchaseOrders.filter((order) => {
      if (status && order.status !== status) return false;
      if (vendorId && order.vendorId !== vendorId) return false;
      if (!withinRange(order.date, from, to)) return false;
      return matchesSearch(search, [order.number, order.vendorName, order.reference]);
    });

    const sorted = sortRecords(
      filtered,
      readString(query, 'sortBy') ?? 'date',
      (readString(query, 'sortDir') as 'asc' | 'desc') ?? 'desc',
      (order, field) => (order as unknown as Record<string, string | number>)[field] ?? order.date,
    );
    return paginate(sorted, query);
  }),

  route('GET', '/purchase-orders/summary', ({ db }) => ({
    count: db.purchaseOrders.length,
    awaitingApproval: db.purchaseOrders.filter((order) => order.status === 'Awaiting Approval').length,
    open: db.purchaseOrders.filter((order) =>
      ['Approved', 'Partially Received', 'Awaiting Approval'].includes(order.status),
    ).length,
    committedValue: db.purchaseOrders
      .filter((order) => !['Cancelled', 'Draft'].includes(order.status))
      .reduce((sum, order) => sum + order.total, 0),
    openValue: db.purchaseOrders
      .filter((order) => ['Approved', 'Partially Received', 'Awaiting Approval'].includes(order.status))
      .reduce((sum, order) => sum + order.total, 0),
  })),

  route('GET', '/purchase-orders/:id', ({ db, params }) => {
    const order = db.purchaseOrders.find((entry) => entry.id === params.id);
    if (!order) throw new ApiError(404, 'Pesanan pembelian tidak ditemukan');
    return order;
  }),

  route('POST', '/purchase-orders', ({ db, body }) => {
    const payload = body as Partial<PurchaseOrder> & { items: PurchaseLineItem[]; vendorId: string };
    const vendor = db.vendors.find((entry) => entry.id === payload.vendorId);
    if (!vendor) throw new ApiError(422, 'Pemasok wajib dipilih', 'VENDOR_REQUIRED');
    const totals = recalcTotals(payload.items ?? []);
    const sequence = db.purchaseOrders.length + 1;
    const created: PurchaseOrder = {
      id: `po-new-${sequence}`,
      number: `PO-${(payload.date ?? TODAY).slice(0, 4)}-${String(sequence).padStart(4, '0')}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      date: payload.date ?? TODAY,
      expectedDate: payload.expectedDate ?? TODAY,
      reference: payload.reference ?? '',
      notes: payload.notes ?? '',
      ...totals,
      receivedPercent: 0,
      status: payload.status ?? 'Draft',
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
      createdBy: db.currentUser.name,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.purchaseOrders.unshift(created);
    return created;
  }),

  route('PUT', '/purchase-orders/:id', ({ db, params, body }) => {
    const index = db.purchaseOrders.findIndex((entry) => entry.id === params.id);
    if (index === -1) throw new ApiError(404, 'Pesanan pembelian tidak ditemukan');
    const existing = db.purchaseOrders[index]!;
    const payload = body as Partial<PurchaseOrder> & { items?: PurchaseLineItem[] };
    const totals = recalcTotals(payload.items ?? existing.items);
    const vendor = payload.vendorId ? db.vendors.find((entry) => entry.id === payload.vendorId) : undefined;
    const updated: PurchaseOrder = {
      ...existing,
      ...payload,
      vendorId: vendor?.id ?? existing.vendorId,
      vendorName: vendor?.name ?? existing.vendorName,
      ...totals,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.purchaseOrders[index] = updated;
    return updated;
  }),

  route('PATCH', '/purchase-orders/:id/status', ({ db, params, body }) => {
    const order = db.purchaseOrders.find((entry) => entry.id === params.id);
    if (!order) throw new ApiError(404, 'Pesanan pembelian tidak ditemukan');
    const status = (body as { status: PurchaseOrder['status'] }).status;
    order.status = status;
    if (status === 'Approved') {
      order.approvedBy = db.currentUser.name;
      order.approvedAt = new Date().toISOString();
    }
    if (status === 'Received' || status === 'Closed') order.receivedPercent = 100;
    order.updatedAt = new Date().toISOString();
    order.updatedBy = db.currentUser.name;
    return order;
  }),

  route('DELETE', '/purchase-orders/:id', ({ db, params }) => {
    const order = db.purchaseOrders.find((entry) => entry.id === params.id);
    if (!order) throw new ApiError(404, 'Pesanan pembelian tidak ditemukan');
    if (order.status !== 'Draft') throw new ApiError(422, 'Hanya pesanan draft yang dapat dihapus', 'PO_LOCKED');
    db.purchaseOrders = db.purchaseOrders.filter((entry) => entry.id !== order.id);
    return { success: true };
  }),

  route('GET', '/purchase-invoices', ({ db, query }) => {
    const search = readString(query, 'search');
    const status = readString(query, 'status');
    const vendorId = readString(query, 'vendorId');
    const from = readString(query, 'from');
    const to = readString(query, 'to');

    const filtered = db.purchaseInvoices.filter((bill) => {
      if (status && bill.status !== status) return false;
      if (vendorId && bill.vendorId !== vendorId) return false;
      if (!withinRange(bill.date, from, to)) return false;
      return matchesSearch(search, [bill.number, bill.vendorInvoiceNumber, bill.vendorName, bill.reference]);
    });

    const sorted = sortRecords(
      filtered,
      readString(query, 'sortBy') ?? 'date',
      (readString(query, 'sortDir') as 'asc' | 'desc') ?? 'desc',
      (bill, field) => (bill as unknown as Record<string, string | number>)[field] ?? bill.date,
    );
    return paginate(sorted, query);
  }),

  route('GET', '/purchase-invoices/summary', ({ db }) => ({
    count: db.purchaseInvoices.length,
    overdue: db.purchaseInvoices.filter((bill) => bill.status === 'Overdue').length,
    purchased: db.purchaseInvoices.reduce((sum, bill) => sum + bill.total, 0),
    paid: db.purchaseInvoices.reduce((sum, bill) => sum + bill.paidAmount, 0),
    outstanding: db.purchaseInvoices.reduce((sum, bill) => sum + bill.outstanding, 0),
    overdueValue: db.purchaseInvoices
      .filter((bill) => bill.status === 'Overdue')
      .reduce((sum, bill) => sum + bill.outstanding, 0),
  })),

  route('GET', '/purchase-invoices/:id', ({ db, params }) => {
    const bill = db.purchaseInvoices.find((entry) => entry.id === params.id);
    if (!bill) throw new ApiError(404, 'Faktur pembelian tidak ditemukan');
    return bill;
  }),

  route('POST', '/purchase-invoices', ({ db, body }) => {
    const payload = body as Partial<PurchaseInvoice> & { items: PurchaseLineItem[]; vendorId: string };
    const vendor = db.vendors.find((entry) => entry.id === payload.vendorId);
    if (!vendor) throw new ApiError(422, 'Pemasok wajib dipilih', 'VENDOR_REQUIRED');
    const totals = recalcTotals(payload.items ?? []);
    const sequence = db.purchaseInvoices.length + 1;
    const linkedOrder = payload.purchaseOrderId
      ? db.purchaseOrders.find((entry) => entry.id === payload.purchaseOrderId)
      : null;
    const created: PurchaseInvoice = {
      id: `bill-new-${sequence}`,
      number: `BILL-${(payload.date ?? TODAY).slice(0, 4)}-${String(sequence).padStart(4, '0')}`,
      vendorInvoiceNumber: payload.vendorInvoiceNumber ?? '',
      vendorId: vendor.id,
      vendorName: vendor.name,
      purchaseOrderId: linkedOrder?.id ?? null,
      purchaseOrderNumber: linkedOrder?.number ?? null,
      date: payload.date ?? TODAY,
      dueDate: payload.dueDate ?? TODAY,
      reference: payload.reference ?? '',
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
    db.purchaseInvoices.unshift(created);
    return created;
  }),

  route('PUT', '/purchase-invoices/:id', ({ db, params, body }) => {
    const index = db.purchaseInvoices.findIndex((entry) => entry.id === params.id);
    if (index === -1) throw new ApiError(404, 'Faktur pembelian tidak ditemukan');
    const existing = db.purchaseInvoices[index]!;
    const payload = body as Partial<PurchaseInvoice> & { items?: PurchaseLineItem[] };
    const totals = recalcTotals(payload.items ?? existing.items);
    const vendor = payload.vendorId ? db.vendors.find((entry) => entry.id === payload.vendorId) : undefined;
    const updated: PurchaseInvoice = {
      ...existing,
      ...payload,
      vendorId: vendor?.id ?? existing.vendorId,
      vendorName: vendor?.name ?? existing.vendorName,
      ...totals,
      outstanding: totals.total - existing.paidAmount,
      updatedAt: new Date().toISOString(),
      updatedBy: db.currentUser.name,
    };
    db.purchaseInvoices[index] = updated;
    return updated;
  }),

  route('POST', '/purchase-invoices/:id/payments', ({ db, params, body }) => {
    const bill = db.purchaseInvoices.find((entry) => entry.id === params.id);
    if (!bill) throw new ApiError(404, 'Faktur pembelian tidak ditemukan');
    const payload = body as { date: string; amount: number; method: string; accountName: string; reference: string };
    if (payload.amount <= 0) throw new ApiError(422, 'Nilai pembayaran harus lebih besar dari nol', 'INVALID_AMOUNT');
    if (payload.amount > bill.outstanding) {
      throw new ApiError(422, 'Nilai pembayaran melebihi sisa utang', 'OVERPAYMENT');
    }
    bill.payments.push({
      id: `${bill.id}-pay-${bill.payments.length + 1}`,
      date: payload.date,
      amount: payload.amount,
      method: payload.method as PurchaseInvoice['payments'][number]['method'],
      accountName: payload.accountName,
      reference: payload.reference,
    });
    bill.paidAmount += payload.amount;
    bill.outstanding = bill.total - bill.paidAmount;
    bill.status = bill.outstanding === 0 ? 'Paid' : 'Partially Paid';
    return bill;
  }),

  route('PATCH', '/purchase-invoices/:id/status', ({ db, params, body }) => {
    const bill = db.purchaseInvoices.find((entry) => entry.id === params.id);
    if (!bill) throw new ApiError(404, 'Faktur pembelian tidak ditemukan');
    bill.status = (body as { status: PurchaseInvoice['status'] }).status;
    if (bill.status === 'Cancelled') bill.outstanding = 0;
    return bill;
  }),

  route('DELETE', '/purchase-invoices/:id', ({ db, params }) => {
    const bill = db.purchaseInvoices.find((entry) => entry.id === params.id);
    if (!bill) throw new ApiError(404, 'Faktur pembelian tidak ditemukan');
    if (bill.status !== 'Draft') throw new ApiError(422, 'Hanya faktur draft yang dapat dihapus', 'BILL_LOCKED');
    db.purchaseInvoices = db.purchaseInvoices.filter((entry) => entry.id !== bill.id);
    return { success: true };
  }),

  route('GET', '/reports/ap-aging', ({ db, query }): ApAgingReport => {
    const asOf = readString(query, 'asOf') ?? TODAY;
    const search = readString(query, 'search');
    const rows: ApAgingRow[] = [];

    for (const vendor of db.vendors) {
      const open = db.purchaseInvoices.filter(
        (bill) => bill.vendorId === vendor.id && bill.outstanding > 0 && bill.date <= asOf,
      );
      if (!open.length) continue;
      const buckets = emptyBuckets();
      open.forEach((bill) => addToBucket(buckets, bill.dueDate, bill.outstanding, asOf));
      rows.push({
        ...buckets,
        partyId: vendor.id,
        partyCode: vendor.code,
        partyName: vendor.name,
        billCount: open.length,
        oldestBillDays: Math.max(...open.map((bill) => daysBetween(bill.dueDate, asOf)), 0),
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
