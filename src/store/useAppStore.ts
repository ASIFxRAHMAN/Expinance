import { create } from 'zustand';
import { Account, Category, Transaction, Subscription } from '../database/types';
import { AccountRepository } from '../database/AccountRepository';
import { CategoryRepository } from '../database/CategoryRepository';
import { TransactionRepository } from '../database/TransactionRepository';
import { SubscriptionRepository } from '../database/SubscriptionRepository';
import { getDB } from '../database/db';

interface AppState {
    // State
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    subscriptions: Subscription[];
    isLoading: boolean;
    error: string | null;
    isDarkMode: boolean;

    // Global Actions
    loadInitialData: () => Promise<void>;
    setDarkMode: (value: boolean) => Promise<void>;

    // Account Actions
    addAccount: (name: string, type: 'cash' | 'bank' | 'wallet' | 'custom', initialBalance: number) => Promise<void>;
    deleteAccount: (id: number) => Promise<void>;

    // Category Actions
    addCategory: (name: string, icon: string, color: string, type: 'income' | 'expense') => Promise<void>;
    deleteCategory: (id: number) => Promise<void>;

    // Transaction Actions
    addTransaction: (amount: number, type: 'income' | 'expense' | 'transfer', category_id: number | null, account_id: number, to_account_id: number | null, date: string, note?: string) => Promise<void>;
    deleteTransaction: (id: number) => Promise<void>;

    // Subscription Actions
    addSubscription: (name: string, amount: number, billing_cycle: 'monthly' | 'annual' | 'weekly', start_date: string, next_billing_date: string, reminder_days?: number) => Promise<void>;
    deleteSubscription: (id: number) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
    accounts: [],
    categories: [],
    transactions: [],
    subscriptions: [],
    isLoading: true,
    error: null,
    isDarkMode: false,

    loadInitialData: async () => {
        try {
            set({ isLoading: true, error: null });
            const accounts = await AccountRepository.getAllAccounts();
            const categories = await CategoryRepository.getAllCategories();
            const transactions = await TransactionRepository.getAllTransactions();
            const subscriptions = await SubscriptionRepository.getAllSubscriptions();

            // Load settings
            const db = await getDB();
            let isDarkMode = false;
            try {
                const modeSetting = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'dark_mode'");
                if (modeSetting && modeSetting.value === 'true') {
                    isDarkMode = true;
                }
            } catch (e) { }

            set({ accounts, categories, transactions, subscriptions, isDarkMode, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    setDarkMode: async (value: boolean) => {
        set({ isDarkMode: value });
        try {
            const db = await getDB();
            await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['dark_mode', value ? 'true' : 'false']);
        } catch (e) { }
    },

    addAccount: async (name, type, initialBalance) => {
        try {
            await AccountRepository.createAccount(name, type, initialBalance);
            await get().loadInitialData(); // reload accounts and calculate correctly
        } catch (error: any) {
            console.error('Add Account Error:', error);
            set({ error: error.message });
            throw error;
        }
    },

    deleteAccount: async (id) => {
        try {
            await AccountRepository.deleteAccount(id);
            await get().loadInitialData();
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    addCategory: async (name, icon, color, type) => {
        try {
            await CategoryRepository.createCategory(name, icon, color, type);
            await get().loadInitialData();
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    deleteCategory: async (id) => {
        try {
            await CategoryRepository.deleteCategory(id);
            await get().loadInitialData();
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    addTransaction: async (amount, type, category_id, account_id, to_account_id, date, note) => {
        try {
            await TransactionRepository.createTransaction(amount, type, category_id, account_id, to_account_id, date, note);
            await get().loadInitialData(); // Re-fetch to get updated balances and transactions
        } catch (error: any) {
            console.error('Add Transaction Error:', error);
            set({ error: error.message });
            throw error;
        }
    },

    deleteTransaction: async (id) => {
        try {
            await TransactionRepository.deleteTransaction(id);
            await get().loadInitialData();
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    addSubscription: async (name, amount, billing_cycle, start_date, next_billing_date, reminder_days = 0) => {
        try {
            await SubscriptionRepository.createSubscription(name, amount, billing_cycle, start_date, next_billing_date, reminder_days);
            await get().loadInitialData();
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    deleteSubscription: async (id) => {
        try {
            await SubscriptionRepository.deleteSubscription(id);
            await get().loadInitialData();
        } catch (error: any) {
            set({ error: error.message });
        }
    }
}));
