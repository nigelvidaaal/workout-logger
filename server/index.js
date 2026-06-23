require('dotenv').config()
// now process.env.JWT_SECRET is available everywhere

// express and CORS installed 
const express = require('express')
const cors = require('cors')

// auth.js from routes
const authRouter = require('./routes/auth')

const app = express()

// allow requests from React's dev server (different port = different origin)
app.use(cors())
// parse incoming JSON request bodies into req.body
app.use(express.json())


// *** PHASE 2 *** auth routes — public, no token needed
app.use('/api/auth', authRouter)

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001')
})