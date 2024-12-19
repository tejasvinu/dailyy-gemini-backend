const express = require('express');
const cors = require('cors');
// ...existing code...

const app = express();

// ...existing middleware...
app.use(cors({
  origin: 'https://dailly-gemini.vercel.app',
  credentials: true
}));

// ...existing routes and error handling...
