import { getDB } from './db';
import { Subscription, RecurringRule } from './types';

export const SubscriptionRepository = {
    createSubscription: async (
        name: string,
        amount: number,
        billing_cycle: 'monthly' | 'annual' | 'weekly',
        start_date: string,
        next_billing_date: string,
        reminder_days: number = 0,
        status: 'active' | 'paused' = 'active'
    ): Promise<number> => {
        const db = await getDB();
        const result = await db.runAsync(
            `INSERT INTO subscriptions (name, amount, billing_cycle, start_date, next_billing_date, reminder_days, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, amount, billing_cycle, start_date, next_billing_date, reminder_days, status]
        );
        return result.lastInsertRowId;
    },

    getAllSubscriptions: async (): Promise<Subscription[]> => {
        const db = await getDB();
        return await db.getAllAsync<Subscription>('SELECT * FROM subscriptions ORDER BY next_billing_date ASC');
    },

    updateSubscription: async (id: number, updates: Partial<Subscription>): Promise<void> => {
        const db = await getDB();
        const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates);

        if (values.length === 0) return;

        await db.runAsync(`UPDATE subscriptions SET ${setClause} WHERE id = ?`, [...values, id]);
    },

    deleteSubscription: async (id: number): Promise<void> => {
        const db = await getDB();
        await db.runAsync('DELETE FROM subscriptions WHERE id = ?', [id]);
    }
};

export const RecurringRuleRepository = {
    // Methods for RecurringRules (To be fully implemented when automation features are added)
    getAllActiveRules: async (): Promise<RecurringRule[]> => {
        const db = await getDB();
        return await db.getAllAsync<RecurringRule>('SELECT * FROM recurring_rules WHERE is_active = 1');
    }
};
