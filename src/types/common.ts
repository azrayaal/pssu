export type ID = string;

export type ISODate = string;

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export type CurrencyCode = 'IDR' | 'USD' | 'SGD' | 'EUR';

export type SortDirection = 'asc' | 'desc';

export interface SortState<TField extends string = string> {
  field: TField;
  direction: SortDirection;
}

export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface QueryParams extends Partial<PageRequest> {
  search?: string;
  sortBy?: string;
  sortDir?: SortDirection;
  [key: string]: string | number | boolean | undefined | string[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface Company {
  id: ID;
  name: string;
  legalName: string;
  taxId: string;
  initials: string;
  currency: CurrencyCode;
  fiscalYearStart: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
}

export interface AuditStamp {
  createdAt: ISODate;
  createdBy: string;
  updatedAt: ISODate;
  updatedBy: string;
}
