const { Pool } = require('pg')

// a Pool manages a set of reusable database connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
})

module.exports = pool