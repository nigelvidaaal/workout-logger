# Persist

A full-stack workout tracker for logging strength training sessions, watching progress over time, and staying consistent. Built with React and Express on top of Postgres.

## What it does

Persist is built around **saved workouts** (reusable exercise templates) and **dated sessions** (a specific day's actual log). Pick a saved workout, log it for today, and it clones straight into a dated session you can fill in.

Logging a set doesn't mean typing into a form. Add an exercise and two "imprinted" set rows are built for you automatically, pre-filled from the last time you did that exercise, edit the numbers inline and tap the checkmark to confirm each one. Tap "+ Add Set" for more. Only confirmed sets count toward your stats, so a draft row you haven't logged yet never skews a chart.

Beyond logging, the app tracks:

- **Personal records & achievements** —> every confirmed set is checked against your history; hitting a new max weight on an exercise triggers a PR celebration and can unlock tiered achievement badges.
- **Muscle balance & anatomy chart** —> an interactive body map (via `react-muscle-highlighter`) showing tonnage and set volume per muscle group, scoped to today/week/month/all-time, so you can see at a glance what you have and haven't trained.
- **Analytics dashboard** —> training volume over time, a top-exercises comparison chart, and body weight tracking with a 7-day moving average trendline.
- **Workout history calendar** —> a week-at-a-glance view of which days you actually trained.
- **Exercise catalog search** —> typeahead search against a seeded exercise database (with muscle group and equipment metadata), or add a fully custom exercise with your own muscle group tag. Favorite the ones you use often.
- **AI training assistant** —> an in-app chat helper (Claude API) for training questions.

## Tech stack

**Frontend:** React 19, Vite, React Router v7, CSS Modules, Recharts, `react-muscle-highlighter`, `canvas-confetti`

**Backend:** Node.js, Express 5, PostgreSQL (hosted on Neon) via `pg`, JWT auth (`jsonwebtoken` + `bcrypt`), Anthropic SDK for the AI assistant

**Testing:** Vitest + React Testing Library

## Project structure

```
workout-logger/
├── src/
│   ├── pages/          # Dashboard, WorkoutList, WorkoutDetail, MuscleChart, PRsPage, Login, Register
│   ├── components/      # Navbar, Sidebar, BottomNav, AnalyticsSection, HistoryCalendar,
│   │                     # MuscleBodyChart, ExerciseSearch, AIHelper, TierModal, ...
│   ├── api/             # fetch wrappers for every backend route
│   └── context/         # auth context
├── server/
│   ├── routes/          # auth, workouts, exercises, sets, prs, r-achievements,
│   │                     # catalog, favorites, analytics, ai
│   ├── achievements.js  # tier definitions + PR/achievement-unlock logic
│   ├── muscle-map.js    # raw catalog muscle names → chart muscle groups
│   ├── muscle_split.js  # tonnage/set-count aggregation by muscle group
│   ├── seed-sets.js     # shared "pre-fill from last confirmed set" helper
│   └── setup-db.js      # one-time/idempotent schema setup script
└── ...
```

## Data model, briefly

- `workouts.is_template` distinguishes a reusable saved workout (no date) from a dated logged session.
- `exercises.catalog_id` optionally links an exercise to a seeded catalog entry; a custom exercise instead carries its own `muscle_group`.
- `sets.completed` marks whether a set has actually been logged — unconfirmed draft rows have nullable `reps`/`weight` and are filtered out of every stats query.
- PR/achievement detection runs at the moment a set is confirmed, keyed on exercise name (case-insensitive), not on a fixed exercise ID — so renamed or re-added exercises still build on the same history.

## Getting started

**Prerequisites:** Node.js, a Postgres database (this project targets [Neon](https://neon.tech)).

```bash
# clone and install
git clone <this-repo>
cd workout-logger
npm install
cd server && npm install
```

Create a `.env` file inside `server/` with:

```
DATABASE_URL=<your postgres connection string>
JWT_SECRET=<any random string>
CLIENT_URL=http://localhost:5173
ANTHROPIC_API_KEY=<optional — needed only for the AI assistant>
```

Set up the database schema:

```bash
cd server
node setup-db.js
```

Run the app (from two terminals):

```bash
# terminal 1 — backend
cd server
npm run dev

# terminal 2 — frontend
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to the backend on `http://localhost:3001`.

## Testing & linting

```bash
npm run lint   # ESLint
npm run test   # Vitest
```

## Deployment

Frontend and backend deploy separately (this project uses Render for both, with Neon as the database). After deploying a schema change, re-run `node setup-db.js` against the **production** database — it's idempotent and safe to run repeatedly, but it has to actually run before the new code that depends on it will work.
