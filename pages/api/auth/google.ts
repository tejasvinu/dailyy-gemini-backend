import { google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID as string,
      process.env.GOOGLE_CLIENT_SECRET as string,
      process.env.GOOGLE_REDIRECT_URI as string
    )
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      // Optionally add Gmail scopes:
      'https://www.googleapis.com/auth/gmail.readonly'
    ]
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    })
    return res.status(200).json({ url: authUrl })
  }
  res.status(405).end()
}