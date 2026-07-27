require('dotenv').config()
const express = require('express')
const cors = require('cors')

// routers
const authRouter = require('./routes/auth')
const workoutsRouter = require('./routes/workouts')
const exercisesRouter = require('./routes/exercises')
const setsRouter = require('./routes/sets')
const prRouter = require('./routes/prs')
const achievementsRouter = require('./routes/r-achievements')

const app = express()

// allow requests from React's dev server
app.use(cors())
// parse incoming JSON request bodies into req.body
app.use(express.json())

// public routes — no token needed
app.use('/api/auth', authRouter)

// protected routes — requireAuth is applied inside each router
app.use('/api/workouts', workoutsRouter)
app.use('/api/workouts', exercisesRouter)
app.use('/api/sets', setsRouter)
// newly added ones, PRs and Achievements 
app.use('/api/prs', prRouter)
app.use('/api/achievements', achievementsRouter)

console.log('SECRET IS:', process.env.JWT_SECRET)

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001')
})

// backend CORS 
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173'
app.use(cors({ origin: allowedOrigin }))

// port
const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))