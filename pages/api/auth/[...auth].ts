import { NextApiRequest, NextApiResponse } from 'next'
import connectDB from '../../../lib/connectDB'
import User from '../../../models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectDB()
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { method } = req
  const authPath = req.query.auth as string[]

  try {
    switch (authPath[0]) {
      case 'register':
        if (method === 'POST') {
          try {
            const user = new User(req.body)
            await user.save()
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!)
            res.status(201).json({ user, token })
          } catch (error: any) {
            res.status(400).json({ error: error.message })
          }
        }
        break

      case 'login':
        if (method === 'POST') {
          try {
            const user = await User.findOne({ email: req.body.email })
            if (!user) throw new Error('Invalid credentials')

            const isMatch = await bcrypt.compare(req.body.password, user.password)
            if (!isMatch) throw new Error('Invalid credentials')

            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!)
            res.json({ user, token })
          } catch (error: any) {
            res.status(400).json({ error: error.message })
          }
        }
        break

      case 'profile':
        if (method === 'GET') {
          try {
            const token = req.headers.authorization?.replace('Bearer ', '')
            if (!token) throw new Error('No authorization token')

            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
            const user = await User.findById(decoded.userId)
            res.json(user)
          } catch (error: any) {
            res.status(401).json({ error: error.message })
          }
        }
        break

      default:
        res.status(404).json({ error: 'Route not found' })
    }

    // Ensure there's always a response
    if (!res.writableEnded) {
      res.status(404).json({ error: 'Not found' })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

