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

    // Database Migrations (Adding columns if they don't exist in legacy installs)
    try {
        await db.execAsync("ALTER TABLE subscriptions ADD COLUMN tenure_days INTEGER DEFAULT 30;");
        console.log("Migration: Added tenure_days to subscriptions");
    } catch (e) { /* Column likely exists */ }

    try {
        await db.execAsync("ALTER TABLE subscriptions ADD COLUMN is_recurring INTEGER DEFAULT 1;");
        console.log("Migration: Added is_recurring to subscriptions");
    } catch (e) { /* Column likely exists */ }

    // Check if categories table is empty, and insert defaults if so
    const categoryResult = await db.getAllAsync('SELECT count(*) as count FROM categories');
    const count = (categoryResult[0] as { count: number }).count;

    if (count === 0) {
        await db.execAsync(DEFAULT_CATEGORIES_QUERY);
    }
};
