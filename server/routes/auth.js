const express = require('express');  // node_modules (installed)
const pool = require('../db-pg')       
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt')

const router = express.Router();     // creates a mini-app instead of going to app.jsx

router.post('/register', async (req, res) => {
  // 1. destructure username and pass from req.body 
  const { username, password } = req.body;

  // validate both fields exist
  if (!username || !password) {
    return res.status(401).json({ error: 'Username/Password not found!'});
  }

  // 2. registering
  const hash = await bcrypt.hash(password, 10)
  // 10 is the "cost factor" — how many rounds of hashing to perform
  // higher = harder to brute-force, but slower. 10 is the standard default

  try {
    // creation of new user by .run()
    const result = await pool.query(
      `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id`,
      [username, hash]
    )

    // create a JWT containing the new user's id as the payload
    // process.env.JWT_SECRET comes from server/.env via dotenv in index.js
    const token = jwt.sign(
      { userId: result.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // CREATED. send back token and username so React can store them
    res.status(201).json({ token, username })
  } catch {
    // error message if the username exists
    return res.status(400).json({ error: 'Username already taken'});
  }
}); 

router.post('/login', async(req, res) => {
  const { username, password } = req.body;

  // find the user by username — .get() returns one object or undefined
  const result = await pool.query(
    `SELECT * FROM users WHERE username = $1`, [username]
  )

  const user = result.rows[0];

  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  
  // compare what they typed against the stored hash
  // bcrypt extracts the salt from the stored hash and re-runs the operation
  const isCorrect = await bcrypt.compare(password, user.password_hash)
  if (!isCorrect) return res.status(401).json({ error: 'Invalid credentials' })

  // credentials verified — create and return a token
  // user.id exists because this user is already in the database
  // SELECT * FROM users WHERE username = ?
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  // response by the end 
  res.json({ token, username })
})

module.exports = router