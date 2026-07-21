const BASE_URL = '/api'

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

// GET /api/workouts — fetch all workouts for the logged-in user
export async function getWorkouts(token) {
  const response = await fetch(`${BASE_URL}/workouts`, {
    // GET requests don't have a body but still need the auth header
    // the server uses the token to know WHOSE workouts to return
    headers: authHeaders(token)
  })
  if (!response.ok) throw new Error('Failed to fetch workouts')
  return response.json()
}

// POST /api/workouts — create a new workout
export async function createWorkout(token, name) {
  const response = await fetch(`${BASE_URL}/workouts`, {
    method: 'POST',
    headers: authHeaders(token),
    // name is the only field needed — user_id comes from the token on the server
    body: JSON.stringify({ name })
  })
  if (!response.ok) throw new Error('Failed to create workout')
  return response.json()
}

// GET /api/workouts/:id — fetch one workout with exercises and sets
export async function getWorkout(token, id) {
  const response = await fetch(`${BASE_URL}/workouts/${id}`, {
    headers: authHeaders(token)
  })
  if (!response.ok) throw new Error('Workout not found')
  return response.json()
}

// DELETE /api/workouts/:id — delete a workout
export async function deleteWorkout(token, id) {
  const response = await fetch(`${BASE_URL}/workouts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  })
  if (!response.ok) throw new Error('Failed to delete workout')
}

// POST /api/workouts/:workoutId/exercises — add exercise to a workout
export async function createExercise(token, workoutId, name) {
  const response = await fetch(`${BASE_URL}/workouts/${workoutId}/exercises`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name })
  })
  if (!response.ok) throw new Error('Failed to create exercise')
  return response.json()
}

// DELETE /api/workouts/exercises/:id — delete an exercise
export async function deleteExercise(token, id) {
  const response = await fetch(`${BASE_URL}/workouts/exercises/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  })
  if (!response.ok) throw new Error('Failed to delete exercise')
}

// POST /api/sets — add a set to an exercise
export async function createSet(token, exerciseId, reps, weight, set_number) {
  const response = await fetch(`${BASE_URL}/sets`, {
    method: 'POST',
    headers: authHeaders(token),
    // exerciseId goes in the body — sets are mounted at /api/sets not nested in URL
    body: JSON.stringify({ exerciseId, reps, weight, set_number })
  })
  if (!response.ok) throw new Error('Failed to create set')
  return response.json()
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
  if (!response.ok) throw new Error('Failed to fetch progress')
  return response.json()
}

// GET /api/achievements — fetch all unlocked achievements
export async function getAchievements(token) {
  const response = await fetch(`${BASE_URL}/achievements`, {
    headers: authHeaders(token)
  })
  if (!response.ok) throw new Error('Failed to fetch achievements')
  return response.json()
}

// GET /api/prs — fetch all PRs
export async function getPRs(token) {
  const response = await fetch(`${BASE_URL}/prs`, {
    headers: authHeaders(token)
  })
  if (!response.ok) throw new Error('Failed to fetch PRs')
  return response.json()
}

// GET /api/achievements/tiers — fetch the tier definitions
export async function getTiers(token) {
  const response = await fetch(`${BASE_URL}/achievements/tiers`, {
    headers: authHeaders(token)
  })
  if (!response.ok) throw new Error('Failed to fetch tiers')
  return response.json()
}