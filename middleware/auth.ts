import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'

export const authMiddleware = (req: NextApiRequest, res: NextApiResponse) => {
  return new Promise((resolve, reject) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        throw new Error('No authorization header')
      }

      const token = authHeader.replace('Bearer ', '')
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
      ;(req as any).user = decoded
      resolve(decoded)
    } catch (error) {
      reject(error)
    }
  })
}

