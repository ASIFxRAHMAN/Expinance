export interface Account {
    id: number;
    name: string;
    type: 'cash' | 'bank' | 'wallet' | 'custom';
    balance: number;
    created_at: string;
}

export interface Category {
    id: number;
    name: string;
    icon: string | null;
    color: string | null;
    type: 'income' | 'expense';
    is_default: number;
}

export interface Transaction {
    id: number;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    category_id: number | null;
    account_id: number;
    to_account_id: number | null;
    date: string;
    note: string | null;
    is_recurring: number;
    recurring_id: number | null;
    created_at: string;
}

export interface Subscription {
    id: number;
    name: string;
    amount: number;
    billing_cycle: 'monthly' | 'annual' | 'weekly';
    start_date: string;
    next_billing_date: string;
    reminder_days: number;
    tenure_days: number;
    is_recurring: number;
    status: 'active' | 'paused';
}

export interface RecurringRule {
    id: number;
    transaction_template: string; // JSON
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    next_due_date: string;
    is_active: number;
}

export interface Setting {
    key: string;
    value: string;
}
