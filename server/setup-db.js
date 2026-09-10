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

    -- is_template = true means a reusable "Saved Workout" (date is NULL, just
    -- an exercise list) rather than a specific day's logged session. Existing
    -- rows all default to false, so every workout already logged stays exactly
    -- as it was — nothing about past data changes.
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false;

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

    -- CLAUDE CODE — "2 imprinted sets" feature: reps/weight are nullable now
    -- because a set can exist as an unconfirmed draft row (completed: false)
    -- before the user has typed anything into it — see seed-sets.js and
    -- server/routes/sets.js. completed defaults to true so this definition
    -- still matches a totally fresh database's expectations for old-style
    -- "every set that exists was already logged" rows.
    CREATE TABLE IF NOT EXISTS sets (
      id SERIAL PRIMARY KEY,
      exercise_id INTEGER NOT NULL,
      reps INTEGER,
      weight REAL,
      set_number INTEGER NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT true,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );

    -- CREATE TABLE IF NOT EXISTS above is a no-op against the already-existing
    -- prod table, so these ALTERs are what actually apply the change there —
    -- same pattern as the muscle_group/catalog_id ALTERs elsewhere in this
    -- file. Existing rows all default to completed = true, so every set ever
    -- actually logged before this migration stays "confirmed" and keeps
    -- counting toward stats exactly as it did before.
    ALTER TABLE sets ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE sets ALTER COLUMN reps DROP NOT NULL;
    ALTER TABLE sets ALTER COLUMN weight DROP NOT NULL;

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

    CREATE TABLE IF NOT EXISTS body_weight (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      weight REAL NOT NULL,
      date DATE NOT NULL,
      UNIQUE (user_id, date)
    );

    -- CLAUDE CODE — favorites (60/40 split, my 40%: "a favorite icon when
    -- searching up a muscle group"). One row per user+catalog exercise;
    -- UNIQUE stops the star from creating duplicates on a double-click/
    -- retried request. Scoped to catalog exercises for now (not custom
    -- ones) since that's what the search dropdown this feeds actually
    -- lists matches from.
    CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      catalog_id TEXT NOT NULL REFERENCES exercise_catalog(id),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (user_id, catalog_id)
    );
  `)

  console.log(' Tables created succesfully')
  await pool.end()            // close the pool so the script exits cleanly 
}

setup().catch((err) => {
  console.error('Setup failed: ', err)
  pool.end()
})