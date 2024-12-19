import { VercelRequest, VercelResponse } from '@vercel/node';
const Note = require('../src/models/Note');
const auth = require('../src/middleware/auth');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get all notes for a user
    try {
      auth(req, res, async () => {
        const notes = await Note.find({ user: req.user.userId });
        res.json(notes);
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else if (req.method === 'POST') {
    // Add a new note
    try {
      auth(req, res, async () => {
        const note = new Note({
          content: req.body.content,
          user: req.user.userId
        });
        const savedNote = await note.save();
        res.status(201).json(savedNote);
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  } else if (req.method === 'DELETE') {
    // Delete a note
    try {
      auth(req, res, async () => {
        const result = await Note.findOneAndDelete({ 
          _id: req.query.id, 
          user: req.user.userId
        });
        
        if (!result) {
          return res.status(404).json({ message: 'Note not found or unauthorized' });
        }
        res.json({ message: 'Note deleted' });
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
