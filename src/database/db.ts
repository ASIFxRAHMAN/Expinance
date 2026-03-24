import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_QUERY, DEFAULT_CATEGORIES_QUERY } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDB = async (): Promise<SQLite.SQLiteDatabase> => {
    if (!dbInstance) {
        dbInstance = await SQLite.openDatabaseAsync('expinance.db');
    }
    return dbInstance;
};

export const initializeDatabase = async (): Promise<void> => {
    const db = await getDB();

    // Create tables if they don't exist
    await db.execAsync(CREATE_TABLES_QUERY);

    // Check if categories table is empty, and insert defaults if so
    const categoryResult = await db.getAllAsync('SELECT count(*) as count FROM categories');
    const count = (categoryResult[0] as { count: number }).count;

    if (count === 0) {
        await db.execAsync(DEFAULT_CATEGORIES_QUERY);
    }
};
