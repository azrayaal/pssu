import { apiClient } from '@/lib/api-client';
import type {
  AgingBucketSet,
  ArAgingReport,
  Customer,
  Invoice,
  InvoicePayment,
  InvoiceStatus,
  Paginated,
  QueryParams,
  RecordStatus,
  SelectOption,
} from '@/types';
import type { CustomerFormValues } from '@/schemas/customer.schema';
import type { InvoiceFormValues } from '@/schemas/invoice.schema';
import type { PaymentFormValues } from '@/schemas/payment.schema';

export interface CustomerSummary {
  total: number;
  active: number;
  outstandingTotal: number;
  overLimit: number;
}

export interface CustomerTransactions {
  invoices: Invoice[];
  payments: (InvoicePayment & { invoiceNumber: string })[];
  aging: AgingBucketSet;
  totals: { invoiceCount: number; billed: number; collected: number; outstanding: number };
}

export interface InvoiceSummary {
  count: number;
  draft: number;
  overdue: number;
  billed: number;
  collected: number;
  outstanding: number;
  overdueValue: number;
}

export const salesService = {
  listCustomers: (params: QueryParams) => apiClient.get<Paginated<Customer>>('/customers', { params }),
  customerOptions: () => apiClient.get<SelectOption[]>('/customers/options'),
  customerSummary: () => apiClient.get<CustomerSummary>('/customers/summary'),
  getCustomer: (id: string) => apiClient.get<Customer>(`/customers/${id}`),
  getCustomerTransactions: (id: string) =>
    apiClient.get<CustomerTransactions>(`/customers/${id}/transactions`),
  createCustomer: (payload: CustomerFormValues) => apiClient.post<Customer>('/customers', payload),
  updateCustomer: (id: string, payload: CustomerFormValues) =>
    apiClient.put<Customer>(`/customers/${id}`, payload),
  setCustomerStatus: (id: string, status: RecordStatus) =>
    apiClient.patch<Customer>(`/customers/${id}/status`, { status }),
  deleteCustomer: (id: string) => apiClient.delete<{ success: boolean }>(`/customers/${id}`),

  listInvoices: (params: QueryParams) => apiClient.get<Paginated<Invoice>>('/invoices', { params }),
  invoiceSummary: () => apiClient.get<InvoiceSummary>('/invoices/summary'),
  getInvoice: (id: string) => apiClient.get<Invoice>(`/invoices/${id}`),
  createInvoice: (payload: InvoiceFormValues) => apiClient.post<Invoice>('/invoices', payload),
  updateInvoice: (id: string, payload: InvoiceFormValues) => apiClient.put<Invoice>(`/invoices/${id}`, payload),
  setInvoiceStatus: (id: string, status: InvoiceStatus) =>
    apiClient.patch<Invoice>(`/invoices/${id}/status`, { status }),
  recordPayment: (id: string, payload: PaymentFormValues) =>
    apiClient.post<Invoice>(`/invoices/${id}/payments`, payload),
  deleteInvoice: (id: string) => apiClient.delete<{ success: boolean }>(`/invoices/${id}`),

  arAging: (params: QueryParams) => apiClient.get<ArAgingReport>('/reports/ar-aging', { params }),
};
