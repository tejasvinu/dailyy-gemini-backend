import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends NextApiRequest {
  user?: any;
}

export const authenticated = (handler: Function) => async (req: AuthRequest, res: NextApiResponse) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    req.user = decoded
    return handler(req, res)
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
