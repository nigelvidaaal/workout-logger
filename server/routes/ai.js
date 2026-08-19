const express = require('express')
const router = express.Router()
const requireAuth = require('../middleware/auth')
const Anthropic = require('@anthropic-ai/sdk')

// one client, created once when the server starts (not per-request) — it
// reads ANTHROPIC_API_KEY from process.env, which server/index.js already
// loads via dotenv.config() at the top of the file
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// sets the assistant's persona/behavior on every request — this is what
// makes replies sound like "Persisting Perry" instead of a generic bot.
// (tightened from the original draft — same premise, fewer run-on clauses,
// and an explicit "keep it short" line since this renders in a chat bubble)
const SYSTEM_PROMPT = `You are Persisting Perry, the AI helper built into the Persist workout tracker.
Help users with fitness questions — form, lifting advice, and hitting their goals.
Keep replies short and friendly, like a supportive workout buddy.`

// POST /api/ai/chat - AI helper, now backed by the real Anthropic API
router.post('/chat', requireAuth, async (req, res) => {
  const { message } = req.body

  if (!message) return res.status(400).json({ error: 'Message required' })

  // fails fast with a clear message instead of letting the SDK throw a
  // confusing error deep inside the try block below
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is missing from server/.env')
    return res.status(500).json({ error: 'AI is not configured yet' })
  }

  try {
    // model + max_tokens + system + messages — the four things every
    // Anthropic API call needs. messages is an array so multi-turn history
    // could be added later; for now it's just this one user message.
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }]
    })

    // response.content is an array of content blocks — index [0] to get
    // the first (and here, only) block, then .text for the actual string
    const reply = response.content[0].text

    res.json({ reply })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'AI request failed' })
  }
})

module.exports = router
