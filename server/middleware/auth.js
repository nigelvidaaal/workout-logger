const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  // 1. reads req.headers.authorization
  const authHeader = req.headers.authorization
  // splits it to get just the token ("format is Bear jvh3hs (token")
  const token = authHeader && authHeader.split(' ')[1];

  // Returns 401 if no token
  if (!token) {
    return res.status(401).json({ error: 'No token provided!'});
  }

   
  try {
    // 2. verify the token if legit 
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // 3. attach the user's id to the req object for route handlers to use 
    req.userId = decoded.userId
    // 4. call next() to pass control to the actual route handler 
    next()
  } catch {
    return res.status(401).json({error: 'Invalid token!'});
  } 
}

module.exports = requireAuth



