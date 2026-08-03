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

// POST /api/workouts — create a new workout
export async function createWorkout(token, name) {
  const response = await fetch(`${BASE_URL}/workouts`, {
    method: 'POST',
    headers: authHeaders(token),
    // name is the only field needed — user_id comes from the token on the server
    body: JSON.stringify({ name })
  })
  return handleResponse(response, 'Failed to create workouts')
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
export async function createExercise(token, workoutId, name, muscleGroup) {
  const response = await fetch(`${BASE_URL}/workouts/${workoutId}/exercises`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name, muscle_group: muscleGroup })
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

// GET /api/workouts/muscle-volume
// total tonnage per muscle group, across all workouts — feeds the anatomy chart
export async function getMuscleVolume(token) {
  const response = await fetch(`${BASE_URL}/workouts/muscle-volume`, {
    headers: authHeaders(token)
  })
  return handleResponse(response, 'Failed to fetch muscle volume')
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
