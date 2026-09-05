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
const catalogRouter = require('./routes/catalog')
const analyticsRouter = require('./routes/analytics')
const aiRouter = require('./routes/ai')
const favoritesRouter = require('./routes/favorites') // NEW — CLAUDE CODE, favorite-a-catalog-exercise

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
app.use('/api/catalog', catalogRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/favorites', favoritesRouter) // NEW — CLAUDE CODE

// ai chat helper
app.use('/api/ai', aiRouter)


// backend CORS 
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173'
app.use(cors({ origin: allowedOrigin }))

// port
const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))