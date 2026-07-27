// database 
const Database = require('better-sqlite3')

// in production, DB_PATH points at Render's persistent disk (e.g. /data/workouts.db)
// locally it's unset, so it falls back to workouts.db in the server folder
const dbPath = process.env.DB_PATH || 'workouts.db'
const db = new Database(dbPath)

// enables actual enforcement of FOREIGN KEY constraints and hierarchy as well
// SQLite disables this by default — without this line constraints are ignored entirely
db.pragma('foreign_keys = ON')

// The hierarchy only moves in one direction per query
// you start somewhere and only climb upward toward the owner. You never go down to a 
// child just to come back up

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    date TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (workout_id) REFERENCES workouts(id)
  );

  CREATE TABLE IF NOT EXISTS sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight REAL NOT NULL,
    set_number INTEGER NOT NULL,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
  );

  CREATE TABLE IF NOT EXISTS prs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exercise_name TEXT NOT NULL,
  weight REAL NOT NULL,
  reps INTEGER NOT NULL,
  set_id INTEGER NOT NULL,
  achieved_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (set_id) REFERENCES sets(id)
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    exercise_name TEXT NOT NULL,
    tier INTEGER NOT NULL,
    unlocked_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE (user_id, exercise_name, tier)
  );
`)

module.exports = db