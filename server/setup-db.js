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
      muscle_group TEXT,
      FOREIGN KEY (workout_id) REFERENCES workouts(id)
    );

    -- CREATE TABLE IF NOT EXISTS is a no-op against the already-existing prod table,
    -- so this ALTER is what actually adds the column there. Safe to rerun.
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS muscle_group TEXT;

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

    -- reference catalog, not tied to any user — seeded by seed-catalog.js from
    -- the free-exercise-db dataset. id is that dataset's own slug (e.g.
    -- "Alternate_Incline_Dumbbell_Curl"), used as-is as the primary key.
    CREATE TABLE IF NOT EXISTS exercise_catalog (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      equipment TEXT,
      category TEXT,
      primary_muscles TEXT[],
      secondary_muscles TEXT[]
    );

    -- nullable — existing exercises and freeform/custom-named ones stay
    -- unlinked; only used when an exercise is explicitly tied to a catalog entry.
    -- must come after exercise_catalog is created above, since it references it.
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS catalog_id TEXT REFERENCES exercise_catalog(id);
  `)

  console.log(' Tables created succesfully')
  await pool.end()            // close the pool so the script exits cleanly 
}

setup().catch((err) => {
  console.error('Setup failed: ', err)
  pool.end()
})