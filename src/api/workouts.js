// reads VITE_API_URL in production; falls back to '/api' for local dev (Vite proxy)
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// helper — builds the Authorization header from the token
// called inside every function that hits a protected route
// this is why we don't need to pass token as a param every time —
// the caller passes it once and this function formats it correctly
function authHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

// central handler for every API response
// if the token is dead (401), clear the session and bounce to login
async function handleResponse(response, errorMessage) {
  // server rejects the token (expired or invalid)
  if (response.status === 401) { 
    // if passes, remove token and username
    localStorage.removeItem("token")
    localStorage.removeItem("username")

    // redirect to login page 
    window.location.href = '/login'
    throw new Error("Session expired, please log in again.")
  } 

  // any other failure 
  if (!response.ok) { 
    throw new Error(errorMessage)
  }

  return response.json()
}

// GET /api/workouts — fetch all workouts for the logged-in user
export async function getWorkouts(token) {
  const response = await fetch(`${BASE_URL}/workouts`, {
    // GET requests don't have a body but still need the auth header
    // the server uses the token to know WHOSE workouts to return
    headers: authHeaders(token)
  })
  return handleResponse(response, 'Failed to fetch workouts')
}

// POST /api/workouts — create a new saved workout (template, no date)
export async function createWorkout(token, name) {
  const response = await fetch(`${BASE_URL}/workouts`, {
    method: 'POST',
    headers: authHeaders(token),
    // name is the only field needed — user_id comes from the token on the server
    body: JSON.stringify({ name })
  })
  return handleResponse(response, 'Failed to create workouts')
}

// POST /api/workouts/:id/log-today — clones a saved workout's exercises into
// a new dated workout for today. Returns the new (dated) workout
export async function logWorkoutToday(token, templateId) {
  const response = await fetch(`${BASE_URL}/workouts/${templateId}/log-today`, {
    method: 'POST',
    headers: authHeaders(token)
  })
  return handleResponse(response, 'Failed to log workout for today')
}

// GET /api/workouts/:id — fetch one workout with exercises and sets
export async function getWorkout(token, id) {
  const response = await fetch(`${BASE_URL}/workouts/${id}`, {
    headers: authHeaders(token)
  })
  return handleResponse(response, 'Failed to fetch workout')
}

// DELETE /api/workouts/:id — delete a workout
export async function deleteWorkout(token, id) {
  const response = await fetch(`${BASE_URL}/workouts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  })
  return handleResponse(response, 'Failed to delete workout')
}

// POST /api/workouts/:workoutId/exercises — add exercise to a workout
// muscle data comes exclusively from the catalog (via catalogId) — no manual muscle_group tagging
export async function createExercise(token, workoutId, name, catalogId) {
  const response = await fetch(`${BASE_URL}/workouts/${workoutId}/exercises`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name, catalogId })
  })
  return handleResponse(response, 'Failed to create exercise')
}

// DELETE /api/workouts/exercises/:id — delete an exercise
export async function deleteExercise(token, id) {
  const response = await fetch(`${BASE_URL}/workouts/exercises/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  })
  return handleResponse(response, 'Failed to delete exercise')
}

// POST /api/sets — add a set to an exercise
export async function createSet(token, exerciseId, reps, weight, set_number) {
  const response = await fetch(`${BASE_URL}/sets`, {
    method: 'POST',
    headers: authHeaders(token),
    // exerciseId goes in the body — sets are mounted at /api/sets not nested in URL
    body: JSON.stringify({ exerciseId, reps, weight, set_number })
  })
  return handleResponse(response, 'Failed to create set')
}

// DELETE /api/sets/:id — delete a set
export async function deleteSet(token, id) {
  const response = await fetch(`${BASE_URL}/sets/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  })
  if (!response.ok) throw new Error('Failed to delete set')
}

// GET /api/workouts/progress/:exerciseName
// fetches max weight per session for a given exercise — used for the progress chart
export async function getExerciseProgress(token, exerciseName) {
  // encodeURIComponent handles spaces in exercise names — "Bench Press" → "Bench%20Press"
  const response = await fetch(
    `${BASE_URL}/workouts/progress/${encodeURIComponent(exerciseName)}`,
    { headers: authHeaders(token) }
  )
  return handleResponse(response, 'Failed to fetch progress')
}

// GET /api/workouts/muscle-volume?range=today|week|month|all
// total tonnage per muscle group, scoped to the given time range — feeds the anatomy chart
export async function getMuscleVolume(token, range = "today") {
  const response = await fetch(
    `${BASE_URL}/workouts/muscle-volume?range=${encodeURIComponent(range)}`,
    { headers: authHeaders(token) }
  )
  return handleResponse(response, 'Failed to fetch muscle volume')
}

// GET /api/workouts/muscle-sets?range=today|week|month|all
// total SETS (not tonnage) per muscle group — feeds the Dashboard's Muscle
// Balance boxes (Phase 3 Part 2). Separate from getMuscleVolume above,
// which the anatomy chart still uses.
export async function getMuscleSets(token, range = "week") {
  const response = await fetch(
    `${BASE_URL}/workouts/muscle-sets?range=${encodeURIComponent(range)}`,
    { headers: authHeaders(token) }
  )
  return handleResponse(response, 'Failed to fetch muscle sets')
}

// GET /api/workouts/history?weekOffset=0
// Phase 3 Part 3 — always 7 days (Monday-Sunday), even ones with zero
// workouts logged — feeds the Dashboard's History calendar. weekOffset:
// 0 = this week, -1 = last week, 1 = next week, etc.
export async function getWorkoutHistory(token, weekOffset = 0) {
  const response = await fetch(
    `${BASE_URL}/workouts/history?weekOffset=${encodeURIComponent(weekOffset)}`,
    { headers: authHeaders(token) }
  )
  return handleResponse(response, 'Failed to fetch workout history')
}

// GET /api/analytics/volume?range=week|month|all
// total training volume bucketed over time — feeds the Dashboard analytics chart
export async function getVolumeAnalytics(token, range = "week") {
  const response = await fetch(
    `${BASE_URL}/analytics/volume?range=${encodeURIComponent(range)}`,
    { headers: authHeaders(token) }
  )
  return handleResponse(response, 'Failed to fetch volume analytics')
}

// GET /api/analytics/exercises?range=week|month|all
// top 6 exercises by volume in the range — feeds the Exercise Comparison chart
export async function getExerciseAnalytics(token, range = "week") {
  const response = await fetch(
    `${BASE_URL}/analytics/exercises?range=${encodeURIComponent(range)}`,
    { headers: authHeaders(token) }
  )
  return handleResponse(response, 'Failed to fetch exercise analytics')
}

// POST /api/analytics/body-weight — upsert today's weight
export async function logBodyWeight(token, weight) {
  const response = await fetch(`${BASE_URL}/analytics/body-weight`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ weight })
  })
  return handleResponse(response, 'Failed to log body weight')
}

// GET /api/analytics/body-weight?range=week|month|all
// daily weights + a 7-day moving-average trendline — feeds the Body Weight chart
export async function getBodyWeightAnalytics(token, range = "week") {
  const response = await fetch(
    `${BASE_URL}/analytics/body-weight?range=${encodeURIComponent(range)}`,
    { headers: authHeaders(token) }
  )
  return handleResponse(response, 'Failed to fetch body weight analytics')
}

// GET /api/catalog?q=... — typeahead search against the seeded exercise catalog
export async function searchCatalog(token, query) {
  // skip the round trip entirely for empty/whitespace-only input
  if (!query.trim()) return []

  const response = await fetch(
    `${BASE_URL}/catalog?q=${encodeURIComponent(query)}`,
    { headers: authHeaders(token) }
  )
  return handleResponse(response, 'Failed to search catalog')
}

// GET /api/achievements — fetch all unlocked achievements
export async function getAchievements(token) {
  const response = await fetch(`${BASE_URL}/achievements`, {
    headers: authHeaders(token)
  })
  return handleResponse(response, 'Failed to fetch achievements')
}

// GET /api/prs — fetch all PRs
export async function getPRs(token) {
  const response = await fetch(`${BASE_URL}/prs`, {
    headers: authHeaders(token)
  })
  return handleResponse(response, 'Failed to fetch PRs')
}

// GET /api/achievements/tiers — fetch the tier definitions
export async function getTiers(token) {
  const response = await fetch(`${BASE_URL}/achievements/tiers`, {
    headers: authHeaders(token)
  })
  return handleResponse(response, 'Failed to fetch tiers')
}

// GET /api/workouts - rename a workout 
export async function renameWorkout(token, id, name) {
  const response = await fetch(`${BASE_URL}/workouts/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ name })
  })
  return handleResponse(response, 'Failed to rename workout')
}

// GET /api/workouts/pr-summary - PR summary over at achievements
export async function getPRSummary(token) {
  const response = await fetch(`${BASE_URL}/workouts/pr-summary`, {
    headers: authHeaders(token),
  })
  return handleResponse(response, 'Failed to fetch PR summary')
}

// POST /api/chat - AI chat helper 
export async function sendAIMessage(token, message) {
  const response = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({message})
  })

  return handleResponse(response, 'AI request failed')
}
