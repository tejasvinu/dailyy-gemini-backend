const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const auth = require('../src/middleware/auth');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://dailly-gemini.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Accept-Encoding');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'POST' && req.url.endsWith('/register')) {
    // Register logic
    try {
      const user = new User(req.body);
      await user.save();
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      res.status(201).json({ user, token });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else if (req.method === 'POST' && req.url.endsWith('/login')) {
    // Login logic
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) throw new Error('Invalid credentials');

      const isMatch = await bcrypt.compare(req.body.password, user.password);
      if (!isMatch) throw new Error('Invalid credentials');

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      res.json({ user, token });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else if (req.method === 'GET' && req.url.endsWith('/profile')) {
    // Get user profile
    try {
      auth(req, res, async () => {
        const user = await User.findById(req.user.userId);
        res.json(user);
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
