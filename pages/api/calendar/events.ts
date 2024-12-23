import type { NextApiRequest, NextApiResponse } from 'next'
import { oauth2Client, calendar } from '../../../lib/googleConfig'
import { authMiddleware } from '../../../middleware/auth'
import { corsMiddleware } from '../../../middleware/cors'

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || []

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  corsMiddleware(req, res)
  
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
        oauth2Client.setCredentials((req as any).user.tokens)
        const today = new Date()
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: today.toISOString(),
          timeMax: new Date(today.setHours(23,59,59,999)).toISOString(),
          maxResults: 10,
          singleEvents: true,
          orderBy: 'startTime',
        })
        res.json(response.data.items)
      } catch (error: any) {
        res.status(500).json({ error: error.message })
      }
      break

    default:
      res.status(405).json({ error: 'Method not allowed' })
  }
}