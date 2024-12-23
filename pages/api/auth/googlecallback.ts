import { google } from 'googleapis'
import jwt from 'jsonwebtoken'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { code } = req.query
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID as string,
        process.env.GOOGLE_CLIENT_SECRET as string,
        process.env.GOOGLE_REDIRECT_URI as string
      )
      const { tokens } = await oauth2Client.getToken(String(code))
      oauth2Client.setCredentials(tokens)
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const userInfo = await oauth2.userinfo.get()
      const token = jwt.sign(
        {
          userId: userInfo.data.id,
          email: userInfo.data.email,
          tokens
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      )
      return res.redirect(`${process.env.FRONTEND_URL}/googlecallback?googleAuthToken=${token}`)
    } catch (error) {
      return res.status(500).json({ error: 'Authentication failed' })
    }
  }
  res.status(405).end()
}