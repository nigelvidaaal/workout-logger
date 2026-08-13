const express = require('express')
const router = express.Router
const requireAuth = require('../middleware/auth')

// POST /api/chat - AI helper 
// STUBBED: returns a mock response later, this where AI call goes  
router.post('/chat', requireAuth, async (req, res) => {
  const { message } = req.body

  if (!message) return res.status(400).json.error({ error: 'Message required' })

    try {
      // later replace 
      const reply = `You asked: " ${message}". (This is a stubbed response — the AI isn't connected yet. 
        Once an API key is added, a real answer will appear here.)`
      // fake delay like a real AI would've done so
      await new Promise((resolve) => setTimeout(resolve, 800)) // 800 ms

      res.json({ reply })
    } catch (err){
      console.error(err)
      res.status(500).json.error({ error: 'AI request failed' })
    }
})

module.exports = router