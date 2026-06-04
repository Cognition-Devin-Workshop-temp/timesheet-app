export interface User {
  email: string;
  createdAt: string;
}

export interface Client {
  id: number;
  name: string;
  description: string | null;
  department: string | null;
  email: string | null;
  billing_address: string | null;
  hourly_rate: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface WorkEntry {
  id: number;
  client_id: number;
  hours: number;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
}

export interface WorkEntryWithClient extends WorkEntry {
  client_name: string;
}

export interface ClientReport {
  client: Client;
  workEntries: WorkEntry[];
  totalHours: number;
  entryCount: number;
}

export interface CreateClientRequest {
  name: string;
  description?: string;
  department?: string;
  email?: string;
  billingAddress?: string;
  hourlyRate?: number | null;
  currency?: string;
}

export interface UpdateClientRequest {
  name?: string;
  description?: string;
  department?: string;
  email?: string;
  billingAddress?: string;
  hourlyRate?: number | null;
  currency?: string;
}

export interface CreateWorkEntryRequest {
  clientId: number;
  hours: number;
  description?: string;
  date: string;
}

export interface UpdateWorkEntryRequest {
  clientId?: number;
  hours?: number;
  description?: string;
  date?: string;
}

export interface LoginRequest {
  email: string;
}

export interface LoginResponse {
  message: string;
  user: User;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  user_email: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  issue_date: string;
  due_date: string;
  payment_terms_days: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  from_name: string | null;
  from_address: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  client_email?: string;
  client_billing_address?: string;
  client_department?: string;
}

export interface InvoiceLineItem {
  id: number;
  invoice_id: number;
  work_entry_id: number | null;
  description: string;
  date: string | null;
  hours: number;
  rate: number;
  amount: number;
  sort_order: number;
}

export interface CreateInvoiceRequest {
  clientId: number;
  dateFrom?: string;
  dateTo?: string;
  paymentTermsDays?: number;
  taxRate?: number;
  notes?: string;
  rateOverride?: number | null;
  includeWorkEntryIds?: number[];
  manualLineItems?: { description: string; hours: number; rate: number; amount: number }[];
}

export interface UpdateInvoiceRequest {
  paymentTermsDays?: number;
  dueDate?: string;
  taxRate?: number;
  notes?: string;
  lineItems?: {
    id?: number;
    workEntryId?: number | null;
    description: string;
    date?: string | null;
    hours: number;
    rate: number;
    amount: number;
    sortOrder?: number;
  }[];
}

export interface BillingProfile {
  userEmail: string;
  companyName: string;
  billingAddress: string;
  phone: string;
  defaultPaymentTermsDays: number;
  defaultTaxRate: number;
  defaultCurrency: string;
  invoicePrefix: string;
  nextInvoiceSeq: number;
}

export interface UpdateBillingProfileRequest {
  companyName?: string;
  billingAddress?: string;
  phone?: string;
  defaultPaymentTermsDays?: number;
  defaultTaxRate?: number;
  defaultCurrency?: string;
  invoicePrefix?: string;
}

export interface InvoiceSummary {
  totalOutstanding: number;
  outstandingCount: number;
  totalPaidThisMonth: number;
  paidCount: number;
  overdueCount: number;
  overdueAmount: number;
  draftCount: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
