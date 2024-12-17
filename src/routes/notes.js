const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const auth = require('../middleware/auth');

// Get all notes for a user
router.get('/', auth, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.userId });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a new note
router.post('/', auth, async (req, res) => {
  try {
    console.log(req.user);
    const note = new Note({
      content: req.body.content,
      user: req.user.userId  // Using ID from token
    });
    const savedNote = await note.save();
    res.status(201).json(savedNote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a note
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await Note.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user.id  // Ensures user can only delete their own notes
    });
    
    if (!result) {
      return res.status(404).json({ message: 'Note not found or unauthorized' });
    }
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
