// one-time script: creates all tables in the Neon Postgres database
// run with: node setup-db.js
require('dotenv').config()
const pool = require('./db-pg');

async function setup() {
  // Postgres runs multiple statements in one query() call
  await pool.query(`
   CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id SERIAL PRIMARY KEY,
      workout_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (workout_id) REFERENCES workouts(id)
    );

    CREATE TABLE IF NOT EXISTS sets (
      id SERIAL PRIMARY KEY,
      exercise_id INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL NOT NULL,
      set_number INTEGER NOT NULL,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );

    CREATE TABLE IF NOT EXISTS prs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      exercise_name TEXT NOT NULL,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      set_id INTEGER NOT NULL,
      achieved_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (set_id) REFERENCES sets(id)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      exercise_name TEXT NOT NULL,
      tier INTEGER NOT NULL,
      unlocked_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE (user_id, exercise_name, tier)
    ); 
  `)

  console.log(' Tables created succesfully')
  await pool.end()            // close the pool so the script exits cleanly 
}

setup().catch((err) => {
  console.error('Setup failed: ', err)
  pool.end()
})