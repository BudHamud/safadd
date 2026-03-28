/**
 * Global Types — safed-mobile
 * Mapped to existing gastos-app database schema (User + Transaction tables)
 */

// ── Transaction ────────────────────────────────────────────────────────────
export type TransactionType = 'income' | 'expense';

/** Matches the `Transaction` table in Supabase (gastos-app schema) */
export interface Transaction {
  id: string;
  // Internal userId from User table (NOT auth.users.id)
  userId: string;
  desc: string;
  amount: number;
  amountUSD?: number | null;
  amountARS?: number | null;
  amountILS?: number | null;
  amountEUR?: number | null;
  tag: string;          // category name (e.g. 'COMIDA', 'TRANSPORTE')
  icon: string;         // emoji
  type: TransactionType;
  date: string;         // 'YYYY-MM-DD' or ISO string
  details?: string | null;
  excludeFromBudget: boolean;
  goalType: string;
  isCancelled: boolean;
  periodicity?: number | null;
  paymentMethod?: string | null;
  cardDigits?: string | null;
  createdAt: string;
}

// ── WebUser ────────────────────────────────────────────────────────────────
/** Matches the `User` table in Supabase (gastos-app schema) */
export interface WebUser {
  id: string;           // internal UUID (used as userId in Transaction)
  username: string;
  authId?: string | null; // = auth.users.id
  role: string;
  monthlyGoal: number;
  currency?: string | null;
  goalCurrency?: string | null;
  availableCurrencies?: string[] | null;
  createdAt: string;
}

// ── Category (derived from tag strings, not a DB table) ───────────────────
export interface Category {
  name: string;  // e.g. 'COMIDA'
  icon: string;  // emoji
  color: string; // hex
}

// ── Payment Methods ────────────────────────────────────────────────────────
export type PaymentMethodType = 'credit' | 'debit' | 'cash' | 'transfer' | 'other';

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  last_four?: string | null;
  color?: string | null;
}

// ── Stats ──────────────────────────────────────────────────────────────────
export interface MonthStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: CategoryStat[];
}

export interface CategoryStat {
  category: Category;
  total: number;
  count: number;
  percentage: number;
}

export interface SpendingTrendPoint {
  label: string;
  income: number;
  expense: number;
}

// ── Filters ────────────────────────────────────────────────────────────────
export interface MovementFilters {
  scope: 'month' | 'year' | 'historical';
  month: number;
  year: number;
  type: TransactionType | 'all';
  tag: string | null;       // category tag filter
  search: string;
}

// ── Utility ────────────────────────────────────────────────────────────────
export type ID = string;

// Profile subset for UI (built from WebUser + auth metadata)
export interface Profile {
  id: string;         // = WebUser.id (internal)
  authId: string;     // = auth.users.id
  username: string;
  full_name: string | null;
  currency: string;
  goal_currency?: string | null;
  available_currencies?: string[] | null;
  monthly_goal: number;
  theme: 'dark' | 'light';
  accent_color: string | null;
  notifications_enabled: boolean;
}
