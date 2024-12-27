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

  const { method } = req

  switch (method) {
    case 'GET':
      try {
        const notes = await Note.find({ user: (req as any).user.userId })
        res.json(notes)
      } catch (error: any) {
        res.status(500).json({ error: error.message })
      }
      break

    case 'POST':
      try {
        const note = new Note({
          content: req.body.content,
          user: (req as any).user.userId,
          status: req.body.status || 'active'
        })
        const savedNote = await note.save()
        res.status(201).json(savedNote)
      } catch (error: any) {
        res.status(400).json({ error: error.message })
      }
      break

    default:
      res.status(405).json({ error: 'Method not allowed' })
  }
}

