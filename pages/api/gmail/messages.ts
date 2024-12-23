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
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

      // Calculate date 3 days ago (adjust time zone if needed)
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      // Format date explicitly for the query
      const year = threeDaysAgo.getFullYear()
      const month = (threeDaysAgo.getMonth() + 1).toString().padStart(2, '0')
      const day = threeDaysAgo.getDate().toString().padStart(2, '0')
      const formattedDate = `${year}/${month}/${day}`

      // Get messages from last 3 days (start with a broad query)
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: `after:${formattedDate}`, // Broad query first
        maxResults: 50 // Increase maxResults for testing
      })

      const messages = response.data.messages || []
      const detailedMessages = await Promise.all(
        messages.map(async (message) => {
          try {
            const detail = await gmail.users.messages.get({
              userId: 'me',
              id: message.id!,
              format: 'metadata',
              metadataHeaders: ['From', 'Subject', 'Date']
            })
            return detail.data
          } catch (error) {
            console.error("Error fetching message details:", error)
            return null; // Handle error gracefully
          }
        })
      )

      res.status(200).json(detailedMessages.filter(Boolean)) // Filter out null values
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.status(405).end()
  }
}