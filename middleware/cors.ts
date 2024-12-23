import { NextApiRequest, NextApiResponse } from 'next'

export const corsMiddleware = (req: NextApiRequest, res: NextApiResponse) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || []
  const origin = req.headers.origin
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }
}
