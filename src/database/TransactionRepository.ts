import { getDB } from './db';
import { Transaction } from './types';

export const TransactionRepository = {
    createTransaction: async (
        amount: number,
        type: 'income' | 'expense' | 'transfer',
        category_id: number | null,
        account_id: number,
        to_account_id: number | null,
        date: string,
        note: string | null = null,
        is_recurring: number = 0,
        recurring_id: number | null = null
    ): Promise<number> => {
        const db = await getDB();
        let insertId = 0;

        await db.withExclusiveTransactionAsync(async (txn) => {
            const result = await txn.runAsync(
                `INSERT INTO transactions (amount, type, category_id, account_id, to_account_id, date, note, is_recurring, recurring_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [amount, type, category_id, account_id, to_account_id, date, note, is_recurring, recurring_id, new Date().toISOString()]
            );

            insertId = result.lastInsertRowId;

            if (type === 'income') {
                await txn.runAsync(`UPDATE accounts SET balance = balance + ? WHERE id = ?`, [amount, account_id]);
            } else if (type === 'expense') {
                await txn.runAsync(`UPDATE accounts SET balance = balance - ? WHERE id = ?`, [amount, account_id]);
            } else if (type === 'transfer' && to_account_id) {
                await txn.runAsync(`UPDATE accounts SET balance = balance - ? WHERE id = ?`, [amount, account_id]);
                await txn.runAsync(`UPDATE accounts SET balance = balance + ? WHERE id = ?`, [amount, to_account_id]);
            }
        });

        return insertId;
    },

    getAllTransactions: async (): Promise<Transaction[]> => {
        const db = await getDB();
        return await db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
    },

    getTransactionsByMonth: async (yearMonth: string): Promise<Transaction[]> => {
        // yearMonth format: 'YYYY-MM'
        const db = await getDB();
        return await db.getAllAsync<Transaction>(
            `SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC, created_at DESC`,
            [`${yearMonth}%`]
        );
    },

    deleteTransaction: async (id: number): Promise<void> => {
        const db = await getDB();

        await db.withExclusiveTransactionAsync(async (txn) => {
            // 1. Get the transaction to know how to reverse the balance
            const tx = await txn.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
            if (!tx) {
                throw new Error('Transaction not found');
            }

            // 2. Reverse Balances
            if (tx.type === 'income') {
                await txn.runAsync(`UPDATE accounts SET balance = balance - ? WHERE id = ?`, [tx.amount, tx.account_id]);
            } else if (tx.type === 'expense') {
                await txn.runAsync(`UPDATE accounts SET balance = balance + ? WHERE id = ?`, [tx.amount, tx.account_id]);
            } else if (tx.type === 'transfer' && tx.to_account_id) {
                await txn.runAsync(`UPDATE accounts SET balance = balance + ? WHERE id = ?`, [tx.amount, tx.account_id]);
                await txn.runAsync(`UPDATE accounts SET balance = balance - ? WHERE id = ?`, [tx.amount, tx.to_account_id]);
            }

            // 3. Delete Transaction
            await txn.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
        });
    }
};
