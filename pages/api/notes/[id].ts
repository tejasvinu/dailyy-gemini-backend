import { NextApiRequest, NextApiResponse } from 'next'
import connectDB from '../../../lib/connectDB'
import Note from '../../../models/Note'
import { authMiddleware } from '../../../middleware/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectDB()
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  try {
    await authMiddleware(req, res)
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' })
  }

  const { method, query: { id } } = req

  if (method === 'DELETE') {
    try {
      const result = await Note.findOneAndDelete({ 
        _id: id, 
        user: (req as any).user.userId
      })
      
      if (!result) {
        return res.status(404).json({ error: 'Note not found or unauthorized' })
      }
      res.json({ message: 'Note deleted' })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  } 
  else if (method === 'PATCH') {
    try {
      const { status } = req.body
      if (!['active', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' })
      }
      const updatedNote = await Note.findOneAndUpdate(
        { _id: id, user: (req as any).user.userId },
        { status },
        { new: true }
      )
      if (!updatedNote) {
        return res.status(404).json({ error: 'Note not found or unauthorized' })
      }
      res.json(updatedNote)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  } 
  else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

