import { getDB } from './db';
import { Category } from './types';

export const CategoryRepository = {
    createCategory: async (
        name: string,
        icon: string,
        color: string,
        type: 'income' | 'expense'
    ): Promise<number> => {
        const db = await getDB();
        const result = await db.runAsync(
            `INSERT INTO categories (name, icon, color, type) VALUES (?, ?, ?, ?)`,
            [name, icon, color, type]
        );
        return result.lastInsertRowId;
    },

    getAllCategories: async (): Promise<Category[]> => {
        const db = await getDB();
        return await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY is_default DESC, name ASC');
    },

    getCategoriesByType: async (type: 'income' | 'expense'): Promise<Category[]> => {
        const db = await getDB();
        return await db.getAllAsync<Category>('SELECT * FROM categories WHERE type = ? ORDER BY is_default DESC, name ASC', [type]);
    },

    deleteCategory: async (id: number): Promise<void> => {
        const db = await getDB();
        // Prevent deletion of default categories
        const category = await db.getFirstAsync<{ is_default: number }>('SELECT is_default FROM categories WHERE id = ?', [id]);
        if (category && category.is_default === 1) {
            throw new Error("Cannot delete a default category.");
        }
        await db.withExclusiveTransactionAsync(async (txn) => {
            await txn.runAsync('UPDATE transactions SET category_id = NULL WHERE category_id = ?', [id]);
            await txn.runAsync('DELETE FROM categories WHERE id = ?', [id]);
        });
    }
};
