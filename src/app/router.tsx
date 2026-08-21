import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RouteErrorBoundary } from './ErrorBoundary';

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));

const ChartOfAccountsPage = lazy(() => import('@/features/accounting/ChartOfAccountsPage'));
const JournalEntriesPage = lazy(() => import('@/features/accounting/JournalEntriesPage'));
const JournalEntryFormPage = lazy(() => import('@/features/accounting/JournalEntryFormPage'));
const JournalEntryDetailPage = lazy(() => import('@/features/accounting/JournalEntryDetailPage'));
const GeneralLedgerPage = lazy(() => import('@/features/accounting/GeneralLedgerPage'));
const TrialBalancePage = lazy(() => import('@/features/accounting/TrialBalancePage'));

const CustomersPage = lazy(() => import('@/features/sales/CustomersPage'));
const CustomerDetailPage = lazy(() => import('@/features/sales/CustomerDetailPage'));
const InvoicesPage = lazy(() => import('@/features/sales/InvoicesPage'));
const InvoiceFormPage = lazy(() => import('@/features/sales/InvoiceFormPage'));
const InvoiceDetailPage = lazy(() => import('@/features/sales/InvoiceDetailPage'));
const ReceivablesPage = lazy(() => import('@/features/sales/ReceivablesPage'));

const VendorsPage = lazy(() => import('@/features/purchase/VendorsPage'));
const VendorDetailPage = lazy(() => import('@/features/purchase/VendorDetailPage'));
const PurchaseOrdersPage = lazy(() => import('@/features/purchase/PurchaseOrdersPage'));
const PurchaseOrderFormPage = lazy(() => import('@/features/purchase/PurchaseOrderFormPage'));
const PurchaseOrderDetailPage = lazy(() => import('@/features/purchase/PurchaseOrderDetailPage'));
const PurchaseInvoicesPage = lazy(() => import('@/features/purchase/PurchaseInvoicesPage'));
const PurchaseInvoiceFormPage = lazy(() => import('@/features/purchase/PurchaseInvoiceFormPage'));
const PurchaseInvoiceDetailPage = lazy(() => import('@/features/purchase/PurchaseInvoiceDetailPage'));
const PayablesPage = lazy(() => import('@/features/purchase/PayablesPage'));

const BankAccountsPage = lazy(() => import('@/features/cash-bank/BankAccountsPage'));
const CashTransactionsPage = lazy(() => import('@/features/cash-bank/CashTransactionsPage'));
const ReconciliationPage = lazy(() => import('@/features/cash-bank/ReconciliationPage'));

const ExpensesPage = lazy(() => import('@/features/expenses/ExpensesPage'));
const ExpenseFormPage = lazy(() => import('@/features/expenses/ExpenseFormPage'));
const ExpenseDetailPage = lazy(() => import('@/features/expenses/ExpenseDetailPage'));
const ExpenseCategoriesPage = lazy(() => import('@/features/expenses/ExpenseCategoriesPage'));

const ProfitLossPage = lazy(() => import('@/features/reports/ProfitLossPage'));
const BalanceSheetPage = lazy(() => import('@/features/reports/BalanceSheetPage'));
const CashFlowPage = lazy(() => import('@/features/reports/CashFlowPage'));
const TrialBalanceReportPage = lazy(() => import('@/features/reports/TrialBalanceReportPage'));
const ArAgingPage = lazy(() => import('@/features/reports/ArAgingPage'));
const ApAgingPage = lazy(() => import('@/features/reports/ApAgingPage'));
const SalesReportPage = lazy(() => import('@/features/reports/SalesReportPage'));
const PurchaseReportPage = lazy(() => import('@/features/reports/PurchaseReportPage'));
const ExpenseReportPage = lazy(() => import('@/features/reports/ExpenseReportPage'));

const UsersPage = lazy(() => import('@/features/administration/UsersPage'));
const UserDetailPage = lazy(() => import('@/features/administration/UserDetailPage'));
const RolesPage = lazy(() => import('@/features/administration/RolesPage'));
const AuditTrailPage = lazy(() => import('@/features/administration/AuditTrailPage'));
const CompanySettingsPage = lazy(() => import('@/features/administration/CompanySettingsPage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <DashboardPage /> },

      { path: 'accounting', element: <Navigate to="/accounting/chart-of-accounts" replace /> },
      { path: 'accounting/chart-of-accounts', element: <ChartOfAccountsPage /> },
      { path: 'accounting/journal-entries', element: <JournalEntriesPage /> },
      { path: 'accounting/journal-entries/new', element: <JournalEntryFormPage /> },
      { path: 'accounting/journal-entries/:id', element: <JournalEntryDetailPage /> },
      { path: 'accounting/journal-entries/:id/edit', element: <JournalEntryFormPage /> },
      { path: 'accounting/general-ledger', element: <GeneralLedgerPage /> },
      { path: 'accounting/trial-balance', element: <TrialBalancePage /> },

      { path: 'sales', element: <Navigate to="/sales/invoices" replace /> },
      { path: 'sales/customers', element: <CustomersPage /> },
      { path: 'sales/customers/:id', element: <CustomerDetailPage /> },
      { path: 'sales/invoices', element: <InvoicesPage /> },
      { path: 'sales/invoices/new', element: <InvoiceFormPage /> },
      { path: 'sales/invoices/:id', element: <InvoiceDetailPage /> },
      { path: 'sales/invoices/:id/edit', element: <InvoiceFormPage /> },
      { path: 'sales/receivables', element: <ReceivablesPage /> },

      { path: 'purchase', element: <Navigate to="/purchase/invoices" replace /> },
      { path: 'purchase/vendors', element: <VendorsPage /> },
      { path: 'purchase/vendors/:id', element: <VendorDetailPage /> },
      { path: 'purchase/orders', element: <PurchaseOrdersPage /> },
      { path: 'purchase/orders/new', element: <PurchaseOrderFormPage /> },
      { path: 'purchase/orders/:id', element: <PurchaseOrderDetailPage /> },
      { path: 'purchase/orders/:id/edit', element: <PurchaseOrderFormPage /> },
      { path: 'purchase/invoices', element: <PurchaseInvoicesPage /> },
      { path: 'purchase/invoices/new', element: <PurchaseInvoiceFormPage /> },
      { path: 'purchase/invoices/:id', element: <PurchaseInvoiceDetailPage /> },
      { path: 'purchase/invoices/:id/edit', element: <PurchaseInvoiceFormPage /> },
      { path: 'purchase/payables', element: <PayablesPage /> },

      { path: 'cash-bank', element: <Navigate to="/cash-bank/accounts" replace /> },
      { path: 'cash-bank/accounts', element: <BankAccountsPage /> },
      { path: 'cash-bank/transactions', element: <CashTransactionsPage /> },
      { path: 'cash-bank/reconciliation', element: <ReconciliationPage /> },

      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'expenses/new', element: <ExpenseFormPage /> },
      { path: 'expenses/categories', element: <ExpenseCategoriesPage /> },
      { path: 'expenses/:id', element: <ExpenseDetailPage /> },
      { path: 'expenses/:id/edit', element: <ExpenseFormPage /> },

      { path: 'reports', element: <Navigate to="/reports/profit-loss" replace /> },
      { path: 'reports/profit-loss', element: <ProfitLossPage /> },
      { path: 'reports/balance-sheet', element: <BalanceSheetPage /> },
      { path: 'reports/cash-flow', element: <CashFlowPage /> },
      { path: 'reports/trial-balance', element: <TrialBalanceReportPage /> },
      { path: 'reports/ar-aging', element: <ArAgingPage /> },
      { path: 'reports/ap-aging', element: <ApAgingPage /> },
      { path: 'reports/sales', element: <SalesReportPage /> },
      { path: 'reports/purchase', element: <PurchaseReportPage /> },
      { path: 'reports/expense', element: <ExpenseReportPage /> },

      { path: 'administration', element: <Navigate to="/administration/users" replace /> },
      { path: 'administration/users', element: <UsersPage /> },
      { path: 'administration/users/:id', element: <UserDetailPage /> },
      { path: 'administration/roles', element: <RolesPage /> },
      { path: 'administration/audit-trail', element: <AuditTrailPage /> },
      { path: 'administration/company', element: <CompanySettingsPage /> },

      { path: '*', element: <RouteErrorBoundary /> },
    ],
  },
]);
