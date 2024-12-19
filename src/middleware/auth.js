const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET.trim());
      req.user = decoded;
      next();
    } catch (jwtError) {
      throw jwtError;
    }

  } catch (error) {
    res.status(401).json({ message: 'Authentication failed: ' + error.message });
  }
};

// ...existing code...

module.exports = auth;
