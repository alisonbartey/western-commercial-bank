import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'western_bank.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL for better concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Initialize schema
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('user', 'admin')) NOT NULL DEFAULT 'user',
      full_name TEXT,
      balance REAL NOT NULL DEFAULT 0,
      current_otp TEXT,
      otp_expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'transfer',
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migrate existing databases: add type column if missing
  const txnColumns = db.prepare('PRAGMA table_info(transactions)').all();
  if (!txnColumns.some((col) => col.name === 'type')) {
    db.exec(`ALTER TABLE transactions ADD COLUMN type TEXT NOT NULL DEFAULT 'transfer'`);
  }

  // Banking details on users
  const userColumns = db.prepare('PRAGMA table_info(users)').all();
  if (!userColumns.some((col) => col.name === 'account_number')) {
    db.exec(`ALTER TABLE users ADD COLUMN account_number TEXT`);
  }
  if (!userColumns.some((col) => col.name === 'routing_number')) {
    db.exec(`ALTER TABLE users ADD COLUMN routing_number TEXT DEFAULT '121000248'`);
  }
  if (!userColumns.some((col) => col.name === 'is_transfer_restricted')) {
    db.exec(`ALTER TABLE users ADD COLUMN is_transfer_restricted INTEGER NOT NULL DEFAULT 0`);
  }
  if (!userColumns.some((col) => col.name === 'is_restricted')) {
    db.exec(`ALTER TABLE users ADD COLUMN is_restricted INTEGER NOT NULL DEFAULT 0`);
  }
  if (!userColumns.some((col) => col.name === 'managed_by_id')) {
    db.exec(`ALTER TABLE users ADD COLUMN managed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  }

  migrateModeratorRole();
  backfillAccountNumbers();

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_user_id);
    CREATE INDEX IF NOT EXISTS idx_users_managed_by ON users(managed_by_id);
  `);

  console.log('✅ Database schema initialized');
}

function generateAccountNumber() {
  let number;
  do {
    number = String(Math.floor(100000000000 + Math.random() * 900000000000));
  } while (db.prepare('SELECT id FROM users WHERE account_number = ?').get(number));
  return number;
}

// SQLite cannot alter CHECK constraints — recreate users table to allow 'moderator' role
function migrateModeratorRole() {
  const tableSql = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
  ).get()?.sql || '';

  if (tableSql.includes("'moderator'")) return;

  db.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('user', 'admin', 'moderator')) NOT NULL DEFAULT 'user',
      full_name TEXT,
      balance REAL NOT NULL DEFAULT 0,
      current_otp TEXT,
      otp_expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      account_number TEXT,
      routing_number TEXT DEFAULT '121000248',
      is_transfer_restricted INTEGER NOT NULL DEFAULT 0,
      is_restricted INTEGER NOT NULL DEFAULT 0,
      managed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    );
    INSERT INTO users_new (
      id, username, email, password_hash, role, full_name, balance,
      current_otp, otp_expires_at, created_at, updated_at,
      account_number, routing_number, is_transfer_restricted, is_restricted, managed_by_id
    )
    SELECT
      id, username, email, password_hash, role, full_name, balance,
      current_otp, otp_expires_at, created_at, updated_at,
      account_number, routing_number,
      COALESCE(is_transfer_restricted, 0),
      COALESCE(is_restricted, is_transfer_restricted, 0),
      managed_by_id
    FROM users;
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
    PRAGMA foreign_keys = ON;
  `);
  console.log('✅ Users table migrated to support moderator role');
}

function backfillAccountNumbers() {
  const users = db.prepare(`SELECT id FROM users WHERE account_number IS NULL OR account_number = ''`).all();
  const stmt = db.prepare(`
    UPDATE users SET account_number = ?, routing_number = COALESCE(routing_number, '121000248') WHERE id = ?
  `);
  for (const user of users) {
    stmt.run(generateAccountNumber(), user.id);
  }
}

// Seed default admin and demo users if they don't exist
function seedInitialData() {
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  
  if (!adminExists) {
    const adminPassword = 'SecureAdmin2026!';
    const hashedPassword = bcrypt.hashSync(adminPassword, 12);
    
    const insertAdmin = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, full_name, balance)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    insertAdmin.run('admin', 'admin@westernbank.com', hashedPassword, 'admin', 'System Administrator', 0);
    console.log('👑 Default admin account created: admin / SecureAdmin2026!');
  }

  // Seed a couple of demo users for easy testing (only if no other users exist besides admin)
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('user').count;
  
  if (userCount === 0) {
    const demoUsers = [
      { username: 'chinedu_okafor', email: 'chinedu.okafor@email.com', full_name: 'Chinedu Okafor', balance: 5420.75, password: 'DemoUser2026!' },
      { username: 'amara_eze', email: 'amara.eze@email.com', full_name: 'Amara Eze', balance: 12850.00, password: 'DemoUser2026!' },
      { username: 'oluwaseun_ade', email: 'oluwaseun.ade@email.com', full_name: 'Oluwaseun Adebayo', balance: 3200.50, password: 'DemoUser2026!' }
    ];

    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, full_name, balance, account_number, routing_number)
      VALUES (?, ?, ?, 'user', ?, ?, ?, '121000248')
    `);

    for (const user of demoUsers) {
      const hash = bcrypt.hashSync(user.password, 10);
      insertUser.run(user.username, user.email, hash, user.full_name, user.balance, generateAccountNumber());
    }
    console.log('👥 Demo user accounts seeded (password: DemoUser2026! for all)');
  }
}

// Helper: Clean expired OTPs (can be called periodically or on queries)
function cleanExpiredOtps() {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE users 
    SET current_otp = NULL, otp_expires_at = NULL 
    WHERE otp_expires_at IS NOT NULL AND otp_expires_at < ?
  `);
  const result = stmt.run(now);
  if (result.changes > 0) {
    console.log(`🧹 Cleaned ${result.changes} expired OTP(s)`);
  }
  return result.changes;
}

// User queries
export const userQueries = {
  findByUsernameOrEmail: (identifier) => {
    return db.prepare(`
      SELECT * FROM users 
      WHERE username = ? OR email = ? 
      LIMIT 1
    `).get(identifier, identifier);
  },

  findById: (id) => {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  createUser: (userData) => {
    const { username, email, password_hash, role = 'user', full_name, balance = 0 } = userData;
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, full_name, balance)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(username, email, password_hash, role, full_name, balance);
    return { id: result.lastInsertRowid, ...userData };
  },

  updateBalance: (userId, newBalance) => {
    const stmt = db.prepare(`
      UPDATE users 
      SET balance = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    return stmt.run(newBalance, userId);
  },

  setOtp: (userId, otp, expiresAt) => {
    const stmt = db.prepare(`
      UPDATE users 
      SET current_otp = ?, otp_expires_at = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    return stmt.run(otp, expiresAt, userId);
  },

  clearOtp: (userId) => {
    const stmt = db.prepare(`
      UPDATE users 
      SET current_otp = NULL, otp_expires_at = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    return stmt.run(userId);
  },

  updatePassword: (userId, passwordHash) => {
    const stmt = db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(passwordHash, userId);
  },

  getAllUsers: () => {
    return db.prepare(`
      SELECT
        u.id, u.username, u.email, u.role, u.full_name, u.balance,
        u.created_at, u.current_otp, u.otp_expires_at,
        u.is_restricted, u.managed_by_id,
        m.full_name AS managed_by_name, m.username AS managed_by_username
      FROM users u
      LEFT JOIN users m ON u.managed_by_id = m.id
      ORDER BY u.created_at DESC
    `).all();
  },

  getUsersByModerator: (moderatorId) => {
    return db.prepare(`
      SELECT
        u.id, u.username, u.email, u.role, u.full_name, u.balance,
        u.created_at, u.current_otp, u.otp_expires_at,
        u.is_restricted, u.managed_by_id
      FROM users u
      WHERE u.managed_by_id = ? AND u.role = 'user'
      ORDER BY u.created_at DESC
    `).all(moderatorId);
  },

  getModerators: () => {
    return db.prepare(`
      SELECT id, username, email, full_name
      FROM users WHERE role = 'moderator'
      ORDER BY full_name ASC
    `).all();
  },

  setRestricted: (userId, restricted) => {
    const stmt = db.prepare(`
      UPDATE users
      SET is_restricted = ?, is_transfer_restricted = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(restricted ? 1 : 0, restricted ? 1 : 0, userId);
  },

  assignModerator: (userId, moderatorId) => {
    const stmt = db.prepare(`
      UPDATE users SET managed_by_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    return stmt.run(moderatorId, userId);
  },

  getActiveOtps: () => {
    const now = new Date().toISOString();
    return db.prepare(`
      SELECT id, username, full_name, current_otp, otp_expires_at
      FROM users 
      WHERE current_otp IS NOT NULL 
        AND otp_expires_at > ?
      ORDER BY otp_expires_at ASC
    `).all(now);
  }
};

// Transaction queries
export const transactionQueries = {
  create: (fromUserId, toUserId, amount, description, type = 'transfer', createdAt = null) => {
    if (createdAt) {
      const stmt = db.prepare(`
        INSERT INTO transactions (from_user_id, to_user_id, amount, description, type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(fromUserId, toUserId, amount, description, type, createdAt);
      return { id: result.lastInsertRowid };
    }
    const stmt = db.prepare(`
      INSERT INTO transactions (from_user_id, to_user_id, amount, description, type)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(fromUserId, toUserId, amount, description, type);
    return { id: result.lastInsertRowid };
  },

  createSeedTransactions: (userId, transactions) => {
    const insert = db.prepare(`
      INSERT INTO transactions (from_user_id, to_user_id, amount, description, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const created = [];
    const runMany = db.transaction((txns) => {
      for (const txn of txns) {
        const daysAgo = parseInt(txn.days_ago, 10) || 0;
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
        const type = txn.type || 'deposit';
        const fromId = type === 'transfer_out' ? userId : userId;
        const toId = type === 'transfer_out' ? userId : userId;
        const result = insert.run(
          fromId,
          toId,
          parseFloat(txn.amount),
          txn.description || type,
          type,
          createdAt
        );
        created.push({ id: result.lastInsertRowid, ...txn, created_at: createdAt });
      }
    });
    runMany(transactions);
    return created;
  },

  getUserTransactions: (userId, limit = 10, offset = 0) => {
    return db.prepare(`
      SELECT 
        t.*,
        u_from.full_name as from_name,
        u_from.username as from_username,
        u_to.full_name as to_name,
        u_to.username as to_username
      FROM transactions t
      JOIN users u_from ON t.from_user_id = u_from.id
      JOIN users u_to ON t.to_user_id = u_to.id
      WHERE t.from_user_id = ? OR t.to_user_id = ?
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, userId, limit, offset);
  },

  countUserTransactions: (userId) => {
    return db.prepare(`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE from_user_id = ? OR to_user_id = ?
    `).get(userId).count;
  },
};

// Initialize everything on import
initializeDatabase();
seedInitialData();
cleanExpiredOtps();

export default db;
export { cleanExpiredOtps };
