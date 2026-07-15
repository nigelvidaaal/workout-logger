// server/check-ach.js
const db = require('./db')
console.log(db.prepare('SELECT * FROM achievements').all())