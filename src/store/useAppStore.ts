import { create } from 'zustand';
import { Account, Category, Transaction, Subscription } from '../database/types';
import { AccountRepository } from '../database/AccountRepository';
import { CategoryRepository } from '../database/CategoryRepository';
import { TransactionRepository } from '../database/TransactionRepository';
import { SubscriptionRepository } from '../database/SubscriptionRepository';
import { getDB } from '../database/db';
import { scheduleSubscriptionReminder, cancelSubscriptionReminder } from '../utils/notifications';

export interface AlertButton {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
}

export interface AlertConfig {
    isVisible: boolean;
    title: string;
    message: string;
    buttons: AlertButton[];
}

interface AppState {
    // State
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    subscriptions: Subscription[];
    isLoading: boolean;
    error: string | null;
    isDarkMode: boolean;
    themeColor: string;
    alertConfig: AlertConfig;

    // Security & Privacy
    isPrivacyEnabled: boolean;
    privacyRevealDuration: number;
    securityPin: string | null;
    geminiApiKey: string | null;
    isAppLocked: boolean;
    isPrivacyMaskRevealed: boolean;
    appLockType: 'none' | 'pin' | 'biometric';
    isGlobalPinPromptVisible: boolean;

    // Global Actions
    loadInitialData: (silent?: boolean) => Promise<void>;
    setDarkMode: (value: boolean) => Promise<void>;
    setThemeColor: (color: string) => Promise<void>;
    setPrivacyEnabled: (enabled: boolean) => Promise<void>;
    setPrivacyRevealDuration: (seconds: number) => Promise<void>;
    setAppLockType: (type: 'none' | 'pin' | 'biometric') => Promise<void>;
    setSecurityPin: (pin: string | null) => Promise<void>;
    setGeminiApiKey: (key: string | null) => Promise<void>;
    unlockApp: (pin?: string) => boolean;
    lockApp: () => void;
    revealPrivacyMask: () => void;
    showGlobalPinPrompt: () => void;
    hideGlobalPinPrompt: () => void;
    showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
    hideAlert: () => void;

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
    addSubscription: (name: string, amount: number, billing_cycle: 'monthly' | 'annual' | 'weekly', start_date: string, next_billing_date: string, reminder_days?: number, tenure_days?: number, is_recurring?: number) => Promise<void>;
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
    themeColor: '#9B59B6', // Default to existing purple theme
    isPrivacyEnabled: false,
    privacyRevealDuration: 2,
    securityPin: null,
    geminiApiKey: null,
    isAppLocked: false,
    isPrivacyMaskRevealed: false,
    appLockType: 'none',
    isGlobalPinPromptVisible: false,
    alertConfig: {
        isVisible: false,
        title: '',
        message: '',
        buttons: []
    },

    showAlert: (title, message, buttons = [{ text: 'OK', style: 'default' }]) => {
        set({ alertConfig: { isVisible: true, title, message, buttons } });
    },

    hideAlert: () => {
        set((state) => ({ alertConfig: { ...state.alertConfig, isVisible: false } }));
    },

    loadInitialData: async (silent = false) => {
        try {
            if (!silent) set({ isLoading: true, error: null });
            const accounts = await AccountRepository.getAllAccounts();
            const categories = await CategoryRepository.getAllCategories();
            const transactions = await TransactionRepository.getAllTransactions();
            const subscriptions = await SubscriptionRepository.getAllSubscriptions();

            // Load settings
            const db = await getDB();
            let isDarkMode = false;
            let themeColor = '#9B59B6';
            let isPrivacyEnabled = false;
            let privacyRevealDuration = 2;
            let securityPin = null;
            let geminiApiKey: string | null = null;
            let isAppLocked = silent ? get().isAppLocked : false;
            let isPrivacyMaskRevealed = silent ? get().isPrivacyMaskRevealed : false;
            let appLockType: 'none' | 'pin' | 'biometric' = 'none';
            let isGlobalPinPromptVisible = silent ? get().isGlobalPinPromptVisible : false;

            try {
                const modeSetting = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'dark_mode'");
                if (modeSetting && modeSetting.value === 'true') {
                    isDarkMode = true;
                }
                const colorSetting = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'theme_color'");
                if (colorSetting && colorSetting.value) {
                    themeColor = colorSetting.value;
                }
                const privacySetting = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'is_privacy_enabled'");
                if (privacySetting && privacySetting.value === 'true') {
                    isPrivacyEnabled = true;
                }

                const durationSetting = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'privacy_reveal_duration'");
                if (durationSetting && durationSetting.value) {
                    privacyRevealDuration = parseInt(durationSetting.value, 10) || 2;
                }

                // Check for App Lock
                const appLockSetting = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'app_lock_type'");
                if (appLockSetting && (appLockSetting.value === 'pin' || appLockSetting.value === 'biometric')) {
                    appLockType = appLockSetting.value as any;
                } else {
                    const legacyAppLock = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'app_lock'");
                    if (legacyAppLock && legacyAppLock.value === 'true') {
                        appLockType = 'pin';
                    }
                }

                if (!silent && appLockType !== 'none') {
                    isAppLocked = true;
                    if (appLockType === 'pin') {
                        isGlobalPinPromptVisible = true;
                    }
                }

                const pinSetting = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'security_pin'");
                if (pinSetting && pinSetting.value) {
                    securityPin = pinSetting.value;
                }
                const geminiSetting = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'gemini_api_key'");
                if (geminiSetting && geminiSetting.value) {
                    geminiApiKey = geminiSetting.value;
                }
            } catch (e) { }

            set({ accounts, categories, transactions, subscriptions, isDarkMode, themeColor, isPrivacyEnabled, privacyRevealDuration, securityPin, geminiApiKey, isAppLocked, isPrivacyMaskRevealed, appLockType, isGlobalPinPromptVisible, isLoading: false });
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

    setThemeColor: async (color: string) => {
        set({ themeColor: color });
        try {
            const db = await getDB();
            await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['theme_color', color]);
        } catch (e) { }
    },

    setPrivacyEnabled: async (enabled: boolean) => {
        set({ isPrivacyEnabled: enabled, isPrivacyMaskRevealed: false });
        try {
            const db = await getDB();
            await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['is_privacy_enabled', enabled ? 'true' : 'false']);
        } catch (e) { }
    },

    setPrivacyRevealDuration: async (seconds: number) => {
        set({ privacyRevealDuration: seconds });
        try {
            const db = await getDB();
            await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['privacy_reveal_duration', seconds.toString()]);
        } catch (e) { }
    },

    setAppLockType: async (type: 'none' | 'pin' | 'biometric') => {
        set({ appLockType: type });
        try {
            const db = await getDB();
            await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['app_lock_type', type]);
        } catch (e) { }
    },

    setSecurityPin: async (pin: string | null) => {
        set({ securityPin: pin });
        try {
            const db = await getDB();
            if (pin) {
                await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['security_pin', pin]);
            } else {
                await db.runAsync("DELETE FROM settings WHERE key = 'security_pin'");
            }
        } catch (e) { }
    },

    setGeminiApiKey: async (key: string | null) => {
        set({ geminiApiKey: key });
        try {
            const db = await getDB();
            if (key) {
                await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['gemini_api_key', key]);
            } else {
                await db.runAsync("DELETE FROM settings WHERE key = 'gemini_api_key'");
            }
        } catch (e) { }
    },

    unlockApp: (pin?: string) => {
        const { appLockType, securityPin } = get();
        if (appLockType === 'pin' && pin !== securityPin) {
            return false;
        }
        set({ isAppLocked: false });
        return true;
    },

    lockApp: () => {
        set({ isAppLocked: true });
    },

    revealPrivacyMask: () => {
        set({ isPrivacyMaskRevealed: true });
        const { privacyRevealDuration } = get();
        setTimeout(() => {
            set({ isPrivacyMaskRevealed: false });
        }, privacyRevealDuration * 1000);
    },

    showGlobalPinPrompt: () => {
        set({ isGlobalPinPromptVisible: true });
    },

    hideGlobalPinPrompt: () => {
        set({ isGlobalPinPromptVisible: false });
    },

    addAccount: async (name, type, initialBalance) => {
        try {
            await AccountRepository.createAccount(name, type, initialBalance);
            await get().loadInitialData(true); // reload accounts silently
        } catch (error: any) {
            console.error('Add Account Error:', error);
            set({ error: error.message });
            throw error;
        }
    },

    deleteAccount: async (id) => {
        try {
            await AccountRepository.deleteAccount(id);
            await get().loadInitialData(true);
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    addCategory: async (name, icon, color, type) => {
        try {
            await CategoryRepository.createCategory(name, icon, color, type);
            await get().loadInitialData(true);
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    deleteCategory: async (id) => {
        try {
            await CategoryRepository.deleteCategory(id);
            await get().loadInitialData(true);
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    addTransaction: async (amount, type, category_id, account_id, to_account_id, date, note) => {
        try {
            await TransactionRepository.createTransaction(amount, type, category_id, account_id, to_account_id, date, note);
            await get().loadInitialData(true); // Re-fetch silently
        } catch (error: any) {
            console.error('Add Transaction Error:', error);
            set({ error: error.message });
            throw error;
        }
    },

    deleteTransaction: async (id) => {
        try {
            await TransactionRepository.deleteTransaction(id);
            await get().loadInitialData(true);
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    addSubscription: async (name, amount, billing_cycle, start_date, next_billing_date, reminder_days = 0, tenure_days = 30, is_recurring = 1) => {
        try {
            const newId = await SubscriptionRepository.createSubscription(name, amount, billing_cycle, start_date, next_billing_date, reminder_days, tenure_days, is_recurring);

            // Schedule the local push notification if a reminder is requested
            if (reminder_days > 0) {
                await scheduleSubscriptionReminder(newId, name, amount, reminder_days, next_billing_date);
            }

            await get().loadInitialData(true);
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    deleteSubscription: async (id) => {
        try {
            await SubscriptionRepository.deleteSubscription(id);
            // Cancel any pending notifications attached to this ID
            await cancelSubscriptionReminder(id);
            await get().loadInitialData(true);
        } catch (error: any) {
            set({ error: error.message });
        }
    }
}));
