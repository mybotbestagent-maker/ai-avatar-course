const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'crm.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    job_type TEXT,
    description TEXT,
    city TEXT,
    source TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'new',
    thumbtack_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS technicians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    cities TEXT DEFAULT '[]',
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    technician_id INTEGER,
    scheduled_date TEXT,
    scheduled_time TEXT,
    city TEXT,
    address TEXT,
    description TEXT,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    direction TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_status INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sms_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    direction TEXT,
    message TEXT,
    phone TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS estimates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    job_id INTEGER,
    title TEXT,
    items TEXT DEFAULT '[]',
    subtotal REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    total REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    job_id INTEGER,
    estimate_id INTEGER,
    title TEXT,
    items TEXT DEFAULT '[]',
    subtotal REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    total REAL DEFAULT 0,
    paid REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    due_date TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER,
    description TEXT,
    amount REAL DEFAULT 0,
    category TEXT DEFAULT 'other',
    date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS price_book (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL DEFAULT 0,
    category TEXT DEFAULT 'General',
    note TEXT DEFAULT '',
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    tags TEXT DEFAULT '[]',
    notes TEXT,
    lead_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'dispatcher',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default technicians
const count = db.prepare('SELECT COUNT(*) as c FROM technicians').get();
if (count.c === 0) {
  db.prepare("INSERT INTO technicians (name, phone, cities) VALUES (?, ?, ?)").run('Matvel', '', '["Miami","Fort Lauderdale","Atlanta"]');
}

module.exports = db;
