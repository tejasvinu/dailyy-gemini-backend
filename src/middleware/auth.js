const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token to verify:', token.substring(0, 20) + '...');
    console.log('JWT_SECRET first 10 chars:', process.env.JWT_SECRET.substring(0, 10) + '...');

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET.trim());
      req.user = decoded;
      console.log('Token successfully decoded:', decoded);
      next();
    } catch (jwtError) {
      console.error('JWT Verification Error Details:', {
        error: jwtError.message,
        tokenLength: token.length,
        secretLength: process.env.JWT_SECRET.length
      });
      throw jwtError;
    }

  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Authentication failed: ' + error.message });
  }
};

module.exports = auth;
