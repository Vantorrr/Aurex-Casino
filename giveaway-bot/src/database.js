const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'giveaway.db');

// Создаем папку data если нет
const fs = require('fs');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// WAL mode для скорости
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// =============================================
// СОЗДАНИЕ ТАБЛИЦ
// =============================================
db.exec(`
  -- Пользователи
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by INTEGER REFERENCES users(id),
    tickets INTEGER DEFAULT 1,
    is_admin INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    joined_channel INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Розыгрыши
  CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    prizes TEXT NOT NULL,           -- JSON массив призов
    status TEXT DEFAULT 'draft',    -- draft, active, finished, cancelled
    max_participants INTEGER,
    require_channel INTEGER DEFAULT 1,
    channel_id TEXT,
    start_date DATETIME,
    end_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Участники розыгрышей
  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    giveaway_id INTEGER NOT NULL REFERENCES giveaways(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    tickets_snapshot INTEGER DEFAULT 1,    -- сколько билетов на момент розыгрыша
    is_winner INTEGER DEFAULT 0,
    prize_index INTEGER,                    -- какой приз выиграл
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(giveaway_id, user_id)
  );

  -- История начисления билетов
  CREATE TABLE IF NOT EXISTS ticket_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,          -- referral, bonus, admin, boost, screenshot
    related_user_id INTEGER,       -- кого привёл (для рефералов)
    giveaway_id INTEGER REFERENCES giveaways(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Бусты канала
  CREATE TABLE IF NOT EXISTS channel_boosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    boost_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    tickets_awarded INTEGER DEFAULT 5,
    UNIQUE(user_id)
  );

  -- Индексы
  CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
  CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
  CREATE INDEX IF NOT EXISTS idx_participants_giveaway ON participants(giveaway_id);
  CREATE INDEX IF NOT EXISTS idx_ticket_log_user ON ticket_log(user_id);
`);

module.exports = db;
