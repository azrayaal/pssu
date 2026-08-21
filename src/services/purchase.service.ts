import { apiClient } from '@/lib/api-client';
import type {
  AgingBucketSet,
  ApAgingReport,
  BillPayment,
  BillStatus,
  Paginated,
  PurchaseInvoice,
  PurchaseOrder,
  PurchaseOrderStatus,
  QueryParams,
  RecordStatus,
  SelectOption,
  Vendor,
} from '@/types';
import type { VendorFormValues } from '@/schemas/vendor.schema';
import type { PurchaseOrderFormValues } from '@/schemas/purchase-order.schema';
import type { PurchaseInvoiceFormValues } from '@/schemas/purchase-invoice.schema';
import type { PaymentFormValues } from '@/schemas/payment.schema';

export interface VendorSummary {
  total: number;
  active: number;
  outstandingTotal: number;
  purchasedTotal: number;
}

export interface VendorTransactions {
  bills: PurchaseInvoice[];
  orders: PurchaseOrder[];
  payments: (BillPayment & { billNumber: string })[];
  aging: AgingBucketSet;
  totals: { billCount: number; orderCount: number; purchased: number; paid: number; outstanding: number };
}

export interface PurchaseOrderSummary {
  count: number;
  awaitingApproval: number;
  open: number;
  committedValue: number;
  openValue: number;
}

export interface PurchaseInvoiceSummary {
  count: number;
  overdue: number;
  purchased: number;
  paid: number;
  outstanding: number;
  overdueValue: number;
}

export const purchaseService = {
  listVendors: (params: QueryParams) => apiClient.get<Paginated<Vendor>>('/vendors', { params }),
  vendorOptions: () => apiClient.get<SelectOption[]>('/vendors/options'),
  vendorSummary: () => apiClient.get<VendorSummary>('/vendors/summary'),
  getVendor: (id: string) => apiClient.get<Vendor>(`/vendors/${id}`),
  getVendorTransactions: (id: string) => apiClient.get<VendorTransactions>(`/vendors/${id}/transactions`),
  createVendor: (payload: VendorFormValues) => apiClient.post<Vendor>('/vendors', payload),
  updateVendor: (id: string, payload: VendorFormValues) => apiClient.put<Vendor>(`/vendors/${id}`, payload),
  setVendorStatus: (id: string, status: RecordStatus) =>
    apiClient.patch<Vendor>(`/vendors/${id}/status`, { status }),
  deleteVendor: (id: string) => apiClient.delete<{ success: boolean }>(`/vendors/${id}`),

  listPurchaseOrders: (params: QueryParams) =>
    apiClient.get<Paginated<PurchaseOrder>>('/purchase-orders', { params }),
  purchaseOrderSummary: () => apiClient.get<PurchaseOrderSummary>('/purchase-orders/summary'),
  getPurchaseOrder: (id: string) => apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`),
  createPurchaseOrder: (payload: PurchaseOrderFormValues) =>
    apiClient.post<PurchaseOrder>('/purchase-orders', payload),
  updatePurchaseOrder: (id: string, payload: PurchaseOrderFormValues) =>
    apiClient.put<PurchaseOrder>(`/purchase-orders/${id}`, payload),
  setPurchaseOrderStatus: (id: string, status: PurchaseOrderStatus) =>
    apiClient.patch<PurchaseOrder>(`/purchase-orders/${id}/status`, { status }),
  deletePurchaseOrder: (id: string) => apiClient.delete<{ success: boolean }>(`/purchase-orders/${id}`),

  listPurchaseInvoices: (params: QueryParams) =>
    apiClient.get<Paginated<PurchaseInvoice>>('/purchase-invoices', { params }),
  purchaseInvoiceSummary: () => apiClient.get<PurchaseInvoiceSummary>('/purchase-invoices/summary'),
  getPurchaseInvoice: (id: string) => apiClient.get<PurchaseInvoice>(`/purchase-invoices/${id}`),
  createPurchaseInvoice: (payload: PurchaseInvoiceFormValues) =>
    apiClient.post<PurchaseInvoice>('/purchase-invoices', payload),
  updatePurchaseInvoice: (id: string, payload: PurchaseInvoiceFormValues) =>
    apiClient.put<PurchaseInvoice>(`/purchase-invoices/${id}`, payload),
  setPurchaseInvoiceStatus: (id: string, status: BillStatus) =>
    apiClient.patch<PurchaseInvoice>(`/purchase-invoices/${id}/status`, { status }),
  recordBillPayment: (id: string, payload: PaymentFormValues) =>
    apiClient.post<PurchaseInvoice>(`/purchase-invoices/${id}/payments`, payload),
  deletePurchaseInvoice: (id: string) => apiClient.delete<{ success: boolean }>(`/purchase-invoices/${id}`),

  apAging: (params: QueryParams) => apiClient.get<ApAgingReport>('/reports/ap-aging', { params }),
};
