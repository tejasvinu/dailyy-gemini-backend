import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'
import { authMiddleware } from '../../../middleware/auth'
import { corsMiddleware } from '../../../middleware/cors'

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

  if (req.method === 'GET') {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      )

      oauth2Client.setCredentials((req as any).user.tokens)
      
      // Get user profile information
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const userInfo = await oauth2.userinfo.get()

      // Get user's profile photo if available
      const people = google.people({ version: 'v1', auth: oauth2Client })
      const profile = await people.people.get({
        resourceName: 'people/me',
        personFields: 'photos,names,emailAddresses,phoneNumbers,locations,birthdays'
      })

      res.status(200).json({
        basic: userInfo.data,
        detailed: profile.data
      })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.status(405).end()
  }
}