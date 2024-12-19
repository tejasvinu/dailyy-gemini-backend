const express = require('express');
const cors = require('cors');
const authRoutes = require('./api/auth/register');
// ...existing code...

const app = express();

// ...existing middleware...

app.use(cors({
  origin: 'https://dailly-gemini.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use('/api/auth/register', authRoutes);

// ...existing routes and error handling...

module.exports = app;
