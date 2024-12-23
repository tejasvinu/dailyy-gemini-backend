
import { google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'
import authMiddleware from '../../middleware/auth'

interface AuthUser {
  error?: string;
  user?: {
    tokens: {
      access_token: string;
      refresh_token: string;
      scope: string;
      token_type: string;
      expiry_date: number;
    };
  };
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const auth = authMiddleware(req, res) as AuthUser
  if (auth.error || !auth.user?.tokens) {
    return res.status(401).json(auth)
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials(auth.user.tokens)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    })
    res.status(200).json(response.data.items)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calendar events' })
  }
}

export default handler