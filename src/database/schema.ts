export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_QUERY = `
-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('cash', 'bank', 'wallet', 'custom')) NOT NULL,
  balance REAL NOT NULL DEFAULT 0.0,
  created_at TEXT NOT NULL
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
  is_default INTEGER DEFAULT 0
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  billing_cycle TEXT CHECK(billing_cycle IN ('monthly', 'annual', 'weekly')) NOT NULL,
  start_date TEXT NOT NULL,
  next_billing_date TEXT NOT NULL,
  reminder_days INTEGER DEFAULT 0,
  status TEXT CHECK(status IN ('active', 'paused')) NOT NULL DEFAULT 'active'
);

-- Recurring Rules Table
CREATE TABLE IF NOT EXISTS recurring_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_template TEXT NOT NULL, -- JSON
  frequency TEXT CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')) NOT NULL,
  next_due_date TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL CHECK(amount > 0),
  type TEXT CHECK(type IN ('income', 'expense', 'transfer')) NOT NULL,
  category_id INTEGER,
  account_id INTEGER NOT NULL,
  to_account_id INTEGER,
  date TEXT NOT NULL,
  note TEXT,
  is_recurring INTEGER DEFAULT 0,
  recurring_id INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY(to_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY(recurring_id) REFERENCES recurring_rules(id) ON DELETE SET NULL
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const DEFAULT_CATEGORIES_QUERY = `
INSERT INTO categories (name, icon, color, type, is_default) VALUES
  ('Food', 'fast-food-outline', '#FF6347', 'expense', 1),
  ('Transport', 'bus-outline', '#4682B4', 'expense', 1),
  ('Bills', 'document-text-outline', '#FFA500', 'expense', 1),
  ('Entertainment', 'film-outline', '#8A2BE2', 'expense', 1),
  ('Health', 'medkit-outline', '#32CD32', 'expense', 1),
  ('Shopping', 'cart-outline', '#FF69B4', 'expense', 1),
  ('Salary', 'cash-outline', '#2E8B57', 'income', 1),
  ('Other', 'ellipsis-horizontal-circle-outline', '#808080', 'expense', 1);
`;
