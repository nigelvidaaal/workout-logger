const BASE_URL = '/api/auth'

export async function login(username, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })

  // throw error 
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Login failed')
  return data
}

export async function register(username, password) {
  const response = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Registration failed')
  return data
}