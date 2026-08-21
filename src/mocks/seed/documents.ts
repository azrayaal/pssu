import { addDays, addMonths, format, parseISO, startOfMonth } from 'date-fns';
import type {
  Expense,
  ExpenseAttachment,
  Invoice,
  InvoiceItem,
  InvoicePayment,
  InvoiceStatus,
  PurchaseInvoice,
  PurchaseLineItem,
  PurchaseOrder,
  PurchaseOrderStatus,
  BillStatus,
} from '@/types';
import { createRng, padNumber, type Rng } from './rng';
import { BANK_ACCOUNTS, CUSTOMERS, EXPENSE_CATEGORIES, USERS, VENDORS } from './reference';
import { EXPENSE_DESCRIPTIONS, PURCHASE_CATALOG, SALES_CATALOG } from './catalog';
import { TODAY } from '@/utils/date';

export const PERIOD_START = '2024-07-01';
const TAX_RATE = 11;

interface MonthSlot {
  index: number;
  start: Date;
  label: string;
}

function buildMonthSlots(): MonthSlot[] {
  const first = startOfMonth(parseISO(PERIOD_START));
  const slots: MonthSlot[] = [];
  for (let i = 0; i < 26; i += 1) {
    const start = addMonths(first, i);
    slots.push({ index: i, start, label: format(start, 'MMM yyyy') });
  }
  return slots;
}

export const MONTH_SLOTS = buildMonthSlots();

function dateInMonth(rng: Rng, slot: MonthSlot, maxDay = 28): string {
  const day = rng.int(1, maxDay);
  const candidate = addDays(slot.start, day - 1);
  const iso = format(candidate, 'yyyy-MM-dd');
  return iso > TODAY ? TODAY : iso;
}

function roundRupiah(value: number): number {
  return Math.round(value);
}

/** Petty cash settles small claims, the main cash box mid-sized ones, banks the rest. */
function pickPaymentAccount(
  rng: Rng,
  total: number,
  accounts: typeof BANK_ACCOUNTS,
): (typeof BANK_ACCOUNTS)[number] {
  const operational = accounts.find((entry) => entry.id === 'bank-001')!;
  if (total <= 4_000_000) {
    return accounts.find((entry) => entry.id === 'bank-006') ?? operational;
  }
  if (total <= 20_000_000 && rng.bool(0.55)) {
    return accounts.find((entry) => entry.id === 'bank-005') ?? operational;
  }
  return operational;
}

function computeLine(
  quantity: number,
  unitPrice: number,
  discountPercent: number,
): { gross: number; discount: number; net: number } {
  const gross = quantity * unitPrice;
  const discount = roundRupiah((gross * discountPercent) / 100);
  return { gross, discount, net: gross - discount };
}

/** Sales growth curve: the business expands steadily across the 14 month window. */
function seasonalFactor(monthIndex: number): number {
  const growth = 1 + monthIndex * 0.016;
  const seasonal = 1 + 0.14 * Math.sin((monthIndex / 12) * Math.PI * 2 - 0.6);
  return growth * seasonal;
}

export function buildInvoices(): Invoice[] {
  const rng = createRng(770425);
  const invoices: Invoice[] = [];
  let sequence = 0;

  for (const slot of MONTH_SLOTS) {
    const isCurrentMonth = slot.index === MONTH_SLOTS.length - 1;
    const count = Math.round((isCurrentMonth ? 8 : 11) * Math.min(1.35, seasonalFactor(slot.index)));

    for (let i = 0; i < count; i += 1) {
      sequence += 1;
      const customer = rng.pick(CUSTOMERS.filter((entry) => entry.status === 'Active'));
      const date = dateInMonth(rng, slot, isCurrentMonth ? 20 : 28);
      const dueDate = format(addDays(parseISO(date), customer.paymentTermDays), 'yyyy-MM-dd');
      const year = date.slice(0, 4);

      const itemCount = rng.weighted([
        { value: 1, weight: 30 },
        { value: 2, weight: 40 },
        { value: 3, weight: 22 },
        { value: 4, weight: 8 },
      ]);

      const chosen = rng.shuffle([...SALES_CATALOG]).slice(0, itemCount);
      const items: InvoiceItem[] = chosen.map((entry, index) => {
        const quantity = entry.unit === 'Man-day' ? rng.int(5, 22) : entry.unit === 'Lisensi' ? rng.int(5, 60) : rng.int(1, 4);
        const basePrice = rng.amount(entry.minPrice, entry.maxPrice, 100_000);
        const unitPrice = roundRupiah(basePrice * (1 + slot.index * 0.006));
        const discountPercent = rng.weighted([
          { value: 0, weight: 62 },
          { value: 2.5, weight: 16 },
          { value: 5, weight: 15 },
          { value: 10, weight: 7 },
        ]);
        const { net } = computeLine(quantity, unitPrice, discountPercent);
        return {
          id: `inv-${padNumber(sequence, 4)}-item-${index + 1}`,
          description: entry.description,
          quantity,
          unit: entry.unit,
          unitPrice,
          discountPercent,
          taxPercent: TAX_RATE,
          amount: net,
        } satisfies InvoiceItem;
      });

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const discountTotal = items.reduce(
        (sum, item) => sum + roundRupiah((item.quantity * item.unitPrice * item.discountPercent) / 100),
        0,
      );
      const netTotal = subtotal - discountTotal;
      const taxTotal = items.reduce((sum, item) => sum + roundRupiah((item.amount * item.taxPercent) / 100), 0);
      const total = netTotal + taxTotal;

      const daysSinceDue = Math.floor(
        (parseISO(TODAY).getTime() - parseISO(dueDate).getTime()) / 86_400_000,
      );

      let status: InvoiceStatus;
      if (isCurrentMonth && rng.bool(0.22)) {
        status = 'Draft';
      } else if (rng.bool(0.03)) {
        status = 'Cancelled';
      } else if (daysSinceDue > 150) {
        status = rng.weighted([
          { value: 'Paid' as InvoiceStatus, weight: 99 },
          { value: 'Overdue' as InvoiceStatus, weight: 1 },
        ]);
      } else if (daysSinceDue > 45) {
        status = rng.weighted([
          { value: 'Paid' as InvoiceStatus, weight: 88 },
          { value: 'Overdue' as InvoiceStatus, weight: 8 },
          { value: 'Partially Paid' as InvoiceStatus, weight: 4 },
        ]);
      } else if (daysSinceDue > 0) {
        status = rng.weighted([
          { value: 'Paid' as InvoiceStatus, weight: 46 },
          { value: 'Overdue' as InvoiceStatus, weight: 32 },
          { value: 'Partially Paid' as InvoiceStatus, weight: 22 },
        ]);
      } else {
        status = rng.weighted([
          { value: 'Sent' as InvoiceStatus, weight: 58 },
          { value: 'Partially Paid' as InvoiceStatus, weight: 22 },
          { value: 'Paid' as InvoiceStatus, weight: 20 },
        ]);
      }

      const payments: InvoicePayment[] = [];
      let paidAmount = 0;
      if (status === 'Paid' || status === 'Partially Paid') {
        const target = status === 'Paid' ? total : roundRupiah(total * (rng.next() * 0.5 + 0.2));
        const installments = status === 'Paid' && rng.bool(0.3) ? 2 : 1;
        let remaining = target;
        for (let p = 0; p < installments; p += 1) {
          const isLast = p === installments - 1;
          const amount = isLast ? remaining : roundRupiah(target * 0.5);
          remaining -= amount;
          const payDateBase = addDays(parseISO(date), rng.int(5, Math.max(6, customer.paymentTermDays + 12)));
          const payDate = format(payDateBase, 'yyyy-MM-dd');
          const bank = rng.weighted([
            { value: BANK_ACCOUNTS.find((entry) => entry.id === 'bank-002')!, weight: 76 },
            { value: BANK_ACCOUNTS.find((entry) => entry.id === 'bank-001')!, weight: 24 },
          ]);
          payments.push({
            id: `inv-${padNumber(sequence, 4)}-pay-${p + 1}`,
            date: payDate > TODAY ? TODAY : payDate,
            amount,
            method: rng.weighted([
              { value: 'Bank Transfer' as const, weight: 78 },
              { value: 'Virtual Account' as const, weight: 14 },
              { value: 'Cheque' as const, weight: 6 },
              { value: 'Cash' as const, weight: 2 },
            ]),
            accountName: bank.name,
            reference: `TRF-${payDate.replace(/-/g, '')}-${padNumber(rng.int(1, 999), 3)}`,
          });
          paidAmount += amount;
        }
      }

      const owner = rng.pick(USERS.filter((user) => user.roleId === 'role-sales-admin'));
      invoices.push({
        id: `inv-${padNumber(sequence, 4)}`,
        number: `INV-${year}-${padNumber(sequence, 4)}`,
        customerId: customer.id,
        customerName: customer.name,
        date,
        dueDate,
        reference: `SO-${year}-${padNumber(rng.int(1, 999), 4)}`,
        terms: `Net ${customer.paymentTermDays} hari sejak tanggal faktur`,
        notes:
          rng.bool(0.35)
            ? 'Pembayaran ditujukan ke rekening operasional perusahaan. Mohon cantumkan nomor faktur pada berita transfer.'
            : '',
        items,
        subtotal,
        discountTotal,
        taxTotal,
        total,
        paidAmount,
        outstanding: status === 'Cancelled' ? 0 : total - paidAmount,
        status,
        payments,
        createdAt: `${date}T04:${padNumber(rng.int(0, 59), 2)}:00.000Z`,
        createdBy: owner.name,
        updatedAt: `${date}T06:${padNumber(rng.int(0, 59), 2)}:00.000Z`,
        updatedBy: owner.name,
      });
    }
  }

  return invoices.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function buildPurchaseOrders(): PurchaseOrder[] {
  const rng = createRng(190833);
  const orders: PurchaseOrder[] = [];
  let sequence = 0;

  for (const slot of MONTH_SLOTS) {
    const isCurrentMonth = slot.index === MONTH_SLOTS.length - 1;
    const count = isCurrentMonth ? 5 : rng.int(6, 9);

    for (let i = 0; i < count; i += 1) {
      sequence += 1;
      const catalogItem = rng.pick(PURCHASE_CATALOG);
      const candidates = VENDORS.filter(
        (vendor) => vendor.status === 'Active' && vendor.category === catalogItem.vendorCategory,
      );
      const vendor = rng.pick(candidates.length ? candidates : VENDORS.slice(0, 5));
      const date = dateInMonth(rng, slot, isCurrentMonth ? 18 : 26);
      const year = date.slice(0, 4);
      const expectedDate = format(addDays(parseISO(date), rng.int(7, 30)), 'yyyy-MM-dd');

      const itemCount = rng.weighted([
        { value: 1, weight: 48 },
        { value: 2, weight: 34 },
        { value: 3, weight: 18 },
      ]);
      const chosen = [catalogItem, ...rng.shuffle([...PURCHASE_CATALOG]).slice(0, itemCount - 1)];

      const items: PurchaseLineItem[] = chosen.map((entry, index) => {
        const quantity = entry.unit === 'Man-day' ? rng.int(4, 18) : rng.int(1, 6);
        const unitPrice = rng.amount(entry.minPrice, entry.maxPrice, 50_000);
        const discountPercent = rng.weighted([
          { value: 0, weight: 74 },
          { value: 2.5, weight: 14 },
          { value: 5, weight: 12 },
        ]);
        const { net } = computeLine(quantity, unitPrice, discountPercent);
        return {
          id: `po-${padNumber(sequence, 4)}-item-${index + 1}`,
          description: entry.description,
          quantity,
          unit: entry.unit,
          unitPrice,
          discountPercent,
          taxPercent: TAX_RATE,
          amount: net,
        } satisfies PurchaseLineItem;
      });

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const discountTotal = items.reduce(
        (sum, item) => sum + roundRupiah((item.quantity * item.unitPrice * item.discountPercent) / 100),
        0,
      );
      const taxTotal = items.reduce((sum, item) => sum + roundRupiah((item.amount * item.taxPercent) / 100), 0);
      const total = subtotal - discountTotal + taxTotal;

      const ageDays = Math.floor((parseISO(TODAY).getTime() - parseISO(date).getTime()) / 86_400_000);
      let status: PurchaseOrderStatus;
      if (ageDays > 75) {
        status = rng.weighted([
          { value: 'Closed' as PurchaseOrderStatus, weight: 82 },
          { value: 'Received' as PurchaseOrderStatus, weight: 13 },
          { value: 'Cancelled' as PurchaseOrderStatus, weight: 5 },
        ]);
      } else if (ageDays > 25) {
        status = rng.weighted([
          { value: 'Received' as PurchaseOrderStatus, weight: 52 },
          { value: 'Partially Received' as PurchaseOrderStatus, weight: 26 },
          { value: 'Closed' as PurchaseOrderStatus, weight: 18 },
          { value: 'Cancelled' as PurchaseOrderStatus, weight: 4 },
        ]);
      } else {
        status = rng.weighted([
          { value: 'Approved' as PurchaseOrderStatus, weight: 40 },
          { value: 'Awaiting Approval' as PurchaseOrderStatus, weight: 28 },
          { value: 'Draft' as PurchaseOrderStatus, weight: 18 },
          { value: 'Partially Received' as PurchaseOrderStatus, weight: 14 },
        ]);
      }

      const approver = rng.pick(USERS.filter((user) => user.roleId === 'role-finance-manager'));
      const needsApproval = status !== 'Draft' && status !== 'Awaiting Approval';
      const receivedPercent =
        status === 'Received' || status === 'Closed' ? 100 : status === 'Partially Received' ? rng.int(25, 80) : 0;

      orders.push({
        id: `po-${padNumber(sequence, 4)}`,
        number: `PO-${year}-${padNumber(sequence, 4)}`,
        vendorId: vendor.id,
        vendorName: vendor.name,
        date,
        expectedDate,
        reference: `PR-${year}-${padNumber(rng.int(1, 999), 4)}`,
        notes: rng.bool(0.3) ? 'Pengiriman dialamatkan ke gudang kantor pusat pada jam kerja.' : '',
        items,
        subtotal,
        discountTotal,
        taxTotal,
        total,
        receivedPercent,
        status,
        approvedBy: needsApproval ? approver.name : null,
        approvedAt: needsApproval ? `${date}T08:30:00.000Z` : null,
        createdAt: `${date}T03:${padNumber(rng.int(0, 59), 2)}:00.000Z`,
        createdBy: 'Putri Ayu Lestari',
        updatedAt: `${date}T09:${padNumber(rng.int(0, 59), 2)}:00.000Z`,
        updatedBy: 'Putri Ayu Lestari',
      });
    }
  }

  return orders.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function buildPurchaseInvoices(orders: PurchaseOrder[]): PurchaseInvoice[] {
  const rng = createRng(551209);
  const bills: PurchaseInvoice[] = [];
  let sequence = 0;

  const linkable = orders.filter((order) =>
    ['Received', 'Partially Received', 'Closed'].includes(order.status),
  );

  for (const order of linkable) {
    sequence += 1;
    const vendor = VENDORS.find((entry) => entry.id === order.vendorId)!;
    const date = format(addDays(parseISO(order.date), rng.int(3, 18)), 'yyyy-MM-dd');
    const billDate = date > TODAY ? TODAY : date;
    const dueDate = format(addDays(parseISO(billDate), vendor.paymentTermDays), 'yyyy-MM-dd');
    const year = billDate.slice(0, 4);

    const daysSinceDue = Math.floor(
      (parseISO(TODAY).getTime() - parseISO(dueDate).getTime()) / 86_400_000,
    );

    let status: BillStatus;
    if (daysSinceDue > 120) {
      status = 'Paid';
    } else if (daysSinceDue > 40) {
      status = rng.weighted([
        { value: 'Paid' as BillStatus, weight: 92 },
        { value: 'Overdue' as BillStatus, weight: 6 },
        { value: 'Partially Paid' as BillStatus, weight: 2 },
      ]);
    } else if (daysSinceDue > 0) {
      status = rng.weighted([
        { value: 'Paid' as BillStatus, weight: 55 },
        { value: 'Overdue' as BillStatus, weight: 27 },
        { value: 'Partially Paid' as BillStatus, weight: 18 },
      ]);
    } else {
      status = rng.weighted([
        { value: 'Awaiting Payment' as BillStatus, weight: 62 },
        { value: 'Partially Paid' as BillStatus, weight: 18 },
        { value: 'Paid' as BillStatus, weight: 20 },
      ]);
    }

    const payments = [];
    let paidAmount = 0;
    if (status === 'Paid' || status === 'Partially Paid') {
      const target = status === 'Paid' ? order.total : roundRupiah(order.total * (rng.next() * 0.45 + 0.25));
      const payDate = format(addDays(parseISO(billDate), rng.int(6, vendor.paymentTermDays + 10)), 'yyyy-MM-dd');
      const bank = BANK_ACCOUNTS.find((entry) => entry.id === 'bank-001')!;
      payments.push({
        id: `bill-${padNumber(sequence, 4)}-pay-1`,
        date: payDate > TODAY ? TODAY : payDate,
        amount: target,
        method: rng.weighted([
          { value: 'Bank Transfer' as const, weight: 88 },
          { value: 'Cheque' as const, weight: 8 },
          { value: 'Cash' as const, weight: 4 },
        ]),
        accountName: bank.name,
        reference: `PAY-${payDate.replace(/-/g, '')}-${padNumber(rng.int(1, 999), 3)}`,
      });
      paidAmount = target;
    }

    bills.push({
      id: `bill-${padNumber(sequence, 4)}`,
      number: `BILL-${year}-${padNumber(sequence, 4)}`,
      vendorInvoiceNumber: `${vendor.code.replace('VEND-', 'FK')}/${year}/${padNumber(rng.int(1, 9999), 5)}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      purchaseOrderId: order.id,
      purchaseOrderNumber: order.number,
      date: billDate,
      dueDate,
      reference: order.reference,
      notes: '',
      items: order.items.map((item, index) => ({ ...item, id: `bill-${padNumber(sequence, 4)}-item-${index + 1}` })),
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      taxTotal: order.taxTotal,
      total: order.total,
      paidAmount,
      outstanding: order.total - paidAmount,
      status,
      payments,
      createdAt: `${billDate}T04:00:00.000Z`,
      createdBy: 'Putri Ayu Lestari',
      updatedAt: `${billDate}T07:00:00.000Z`,
      updatedBy: 'Bambang Prasetyo',
    });
  }

  return bills.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function buildExpenses(): Expense[] {
  const rng = createRng(884471);
  const expenses: Expense[] = [];
  let sequence = 0;
  const activeCategories = EXPENSE_CATEGORIES.filter((entry) => entry.status === 'Active');
  const payAccounts = BANK_ACCOUNTS.filter((entry) => entry.status === 'Active');

  for (const slot of MONTH_SLOTS) {
    const isCurrentMonth = slot.index === MONTH_SLOTS.length - 1;
    const count = isCurrentMonth ? 11 : rng.int(14, 19);

    for (let i = 0; i < count; i += 1) {
      sequence += 1;
      const category = rng.pick(activeCategories);
      const date = dateInMonth(rng, slot, isCurrentMonth ? 20 : 28);
      const descriptions = EXPENSE_DESCRIPTIONS[category.code] ?? ['Pengeluaran operasional'];
      const description = rng.pick(descriptions);
      const budgetShare = category.monthlyBudget / rng.int(2, 5);
      const amount = rng.amount(budgetShare * 0.35, budgetShare * 1.1, 25_000);
      const taxable = rng.bool(0.45);
      const taxAmount = taxable ? roundRupiah((amount * TAX_RATE) / 100) : 0;
      const account = pickPaymentAccount(rng, amount + taxAmount, payAccounts);
      const submitter = rng.pick(USERS.filter((user) => user.status === 'Active'));
      const approver = rng.pick(USERS.filter((user) => user.roleId === 'role-finance-manager'));

      const ageDays = Math.floor((parseISO(TODAY).getTime() - parseISO(date).getTime()) / 86_400_000);
      const status = ageDays > 20
        ? rng.weighted([
            { value: 'Paid' as const, weight: 90 },
            { value: 'Approved' as const, weight: 6 },
            { value: 'Rejected' as const, weight: 4 },
          ])
        : rng.weighted([
            { value: 'Paid' as const, weight: 34 },
            { value: 'Approved' as const, weight: 26 },
            { value: 'Submitted' as const, weight: 28 },
            { value: 'Draft' as const, weight: 12 },
          ]);

      const attachments: ExpenseAttachment[] = rng.bool(0.62)
        ? [
            {
              id: `exp-${padNumber(sequence, 4)}-att-1`,
              fileName: `bukti-${category.code.toLowerCase()}-${date.replace(/-/g, '')}.pdf`,
              sizeBytes: rng.int(85_000, 2_400_000),
              mimeType: 'application/pdf',
              uploadedAt: `${date}T05:20:00.000Z`,
            },
          ]
        : [];

      expenses.push({
        id: `exp-${padNumber(sequence, 4)}`,
        number: `EXP-${date.slice(0, 4)}-${padNumber(sequence, 4)}`,
        date,
        categoryId: category.id,
        categoryName: category.name,
        description,
        amount,
        taxAmount,
        total: amount + taxAmount,
        paymentAccountId: account.id,
        paymentAccountName: account.name,
        vendorName: rng.bool(0.6) ? rng.pick(VENDORS).name : '',
        reference: `RCP-${date.replace(/-/g, '')}-${padNumber(rng.int(1, 999), 3)}`,
        status,
        notes: rng.bool(0.25) ? 'Bukti pengeluaran telah diverifikasi oleh bagian akuntansi.' : '',
        attachments,
        submittedBy: submitter.name,
        approvedBy: status === 'Approved' || status === 'Paid' ? approver.name : null,
        createdAt: `${date}T04:${padNumber(rng.int(0, 59), 2)}:00.000Z`,
        createdBy: submitter.name,
        updatedAt: `${date}T08:${padNumber(rng.int(0, 59), 2)}:00.000Z`,
        updatedBy: submitter.name,
      });
    }
  }

  return expenses.sort((a, b) => (a.date < b.date ? 1 : -1));
}
