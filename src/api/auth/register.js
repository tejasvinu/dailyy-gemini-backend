const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');

// Handle preflight OPTIONS request
router.options('/', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': 'https://dailly-gemini.vercel.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.status(200).end();
});

// ...existing register route logic...

module.exports = router;
