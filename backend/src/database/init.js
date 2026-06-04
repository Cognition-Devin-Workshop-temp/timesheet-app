const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db = null;
let isClosing = false;
let isClosed = false;

function getDatabase() {
  if (!db) {
    // Reset state when creating a new database connection
    isClosing = false;
    isClosed = false;
    // Use in-memory database as specified in requirements
    db = new sqlite3.Database(':memory:', (err) => {
      if (err) {
        console.error('Error opening database:', err);
        throw err;
      }
      console.log('Connected to SQLite in-memory database');
    });
  }
  return db;
}

async function initializeDatabase() {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // Create users table
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          email TEXT PRIMARY KEY,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create clients table
      database.run(`
        CREATE TABLE IF NOT EXISTS clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          department TEXT,
          email TEXT,
          billing_address TEXT,
          hourly_rate DECIMAL(10,2),
          currency TEXT DEFAULT 'USD',
          user_email TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
        )
      `);

      // Create work_entries table
      database.run(`
        CREATE TABLE IF NOT EXISTS work_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL,
          user_email TEXT NOT NULL,
          hours DECIMAL(5,2) NOT NULL,
          description TEXT,
          date DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
          FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
        )
      `);

      // Create user_billing_profiles table
      database.run(`
        CREATE TABLE IF NOT EXISTS user_billing_profiles (
          user_email TEXT PRIMARY KEY,
          company_name TEXT,
          billing_address TEXT,
          phone TEXT,
          default_payment_terms_days INTEGER DEFAULT 30,
          default_tax_rate DECIMAL(5,4) DEFAULT 0,
          default_currency TEXT DEFAULT 'USD',
          invoice_prefix TEXT DEFAULT 'INV',
          next_invoice_seq INTEGER DEFAULT 1,
          FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
        )
      `);

      // Create invoices table
      database.run(`
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number TEXT NOT NULL,
          client_id INTEGER NOT NULL,
          user_email TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft',
          issue_date DATE NOT NULL,
          due_date DATE NOT NULL,
          payment_terms_days INTEGER DEFAULT 30,
          subtotal DECIMAL(10,2) NOT NULL,
          tax_rate DECIMAL(5,4) DEFAULT 0,
          tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
          total DECIMAL(10,2) NOT NULL,
          notes TEXT,
          from_name TEXT,
          from_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id),
          FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
        )
      `);

      // Create invoice_line_items table
      database.run(`
        CREATE TABLE IF NOT EXISTS invoice_line_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL,
          work_entry_id INTEGER,
          description TEXT NOT NULL,
          date DATE,
          hours DECIMAL(5,2) NOT NULL,
          rate DECIMAL(10,2) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          sort_order INTEGER DEFAULT 0,
          FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
          FOREIGN KEY (work_entry_id) REFERENCES work_entries (id) ON DELETE SET NULL
        )
      `);

      // Create indexes for better performance
      database.run(`CREATE INDEX IF NOT EXISTS idx_clients_user_email ON clients (user_email)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_work_entries_client_id ON work_entries (client_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_work_entries_user_email ON work_entries (user_email)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_work_entries_date ON work_entries (date)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_invoices_user_email ON invoices (user_email)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices (client_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items (invoice_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_invoice_line_items_work_entry_id ON invoice_line_items (work_entry_id)`);

      console.log('Database tables created successfully');
      resolve();
    });
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (isClosed) {
      // Already closed, resolve immediately
      resolve();
      return;
    }
    
    if (isClosing) {
      // Currently closing, wait for it to complete
      const checkClosed = setInterval(() => {
        if (isClosed) {
          clearInterval(checkClosed);
          resolve();
        }
      }, 10);
      return;
    }
    
    if (!db) {
      // No database connection, resolve immediately
      resolve();
      return;
    }
    
    isClosing = true;
    db.close((err) => {
      isClosed = true;
      isClosing = false;
      db = null;
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
      resolve();
    });
  });
}

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase
};
