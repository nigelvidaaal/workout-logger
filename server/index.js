const express = require('express')
const cors = require('cors')

const app = express()

// allow requests from React's dev server (different port = different origin)
app.use(cors())
// parse incoming JSON request bodies into req.body
app.use(express.json())

// routes will be added here in Phase 2 and 3

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001')
})