// database 
const Database = require('better-sqlite3')
const db = new Database('workouts.db')

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
`)

module.exports = db