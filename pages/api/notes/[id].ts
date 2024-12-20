import { NextApiRequest, NextApiResponse } from 'next'
import connectDB from '../../../lib/connectDB'
import Note from '../../../models/Note'
import { authMiddleware } from '../../../middleware/auth'

connectDB()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

