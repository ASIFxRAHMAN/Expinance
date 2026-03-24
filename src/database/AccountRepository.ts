import { getDB } from './db';
import { Account } from './types';

export const AccountRepository = {
    createAccount: async (name: string, type: string, initialBalance: number = 0.0): Promise<number> => {
        const db = await getDB();
        const result = await db.runAsync(
            `INSERT INTO accounts (name, type, balance, created_at) VALUES (?, ?, ?, ?)`,
            [name, type, initialBalance, new Date().toISOString()]
        );
        return result.lastInsertRowId;
    },

    getAllAccounts: async (): Promise<Account[]> => {
        const db = await getDB();
        return await db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY name ASC');
    },

    getAccountById: async (id: number): Promise<Account | null> => {
        const db = await getDB();
        const result = await db.getFirstAsync<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
        return result || null;
    },

    updateAccountBalance: async (id: number, newBalance: number): Promise<void> => {
        const db = await getDB();
        await db.runAsync('UPDATE accounts SET balance = ? WHERE id = ?', [newBalance, id]);
    },

    deleteAccount: async (id: number): Promise<void> => {
        const db = await getDB();
        await db.withExclusiveTransactionAsync(async (txn) => {
            await txn.runAsync('DELETE FROM transactions WHERE account_id = ? OR to_account_id = ?', [id, id]);
            await txn.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
        });
    }
};
