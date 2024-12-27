import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'
import { authMiddleware } from '../../../middleware/auth'
import { corsMiddleware } from '../../../middleware/cors'
import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) throw new Error('GEMINI_API_KEY is not defined in environment variables')
const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  systemInstruction: 'You are an assistant that provides concise and insightful summaries of recent emails for a personal dashboard. Focus on key information such as important senders, main subjects, and actionable items. Ensure the summaries are clear, well-organized, and tailored to help the user efficiently manage their daily tasks and communications.'
})
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: 'text/plain',
}

interface EmailHeader {
  name: string;
  value: string;
}

async function generateSummary(messages: any[]) {
  const chatSession = model.startChat({ generationConfig, history: [] })
  const emailDetails = messages.map((m) => {
    const fromHeader = m.payload?.headers?.find((h: EmailHeader) => h.name === 'From')?.value || 'Unknown'
    const subjectHeader = m.payload?.headers?.find((h: EmailHeader) => h.name === 'Subject')?.value || 'No Subject'
    return `From: ${fromHeader}\nSubject: ${subjectHeader}\n`
  }).join('\n')

  const result = await chatSession.sendMessage(
    `Please provide a summary of the following emails for my personal dashboard. Highlight important senders, subjects, and any actionable items.\n\n${emailDetails}`
  )
  return result.response.text()
}

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

      // Calculate date 3 days ago
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      const year = threeDaysAgo.getFullYear()
      const month = (threeDaysAgo.getMonth() + 1).toString().padStart(2, '0')
      const day = threeDaysAgo.getDate().toString().padStart(2, '0')
      const formattedDate = `${year}/${month}/${day}`

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: `after:${formattedDate}`,
        maxResults: 10 // Reduced from 50 to 10
      })

      const messages = response.data.messages || []
      const detailedMessages = await Promise.all(
        messages.map(async (message) => {
          try {
            const detail = await Promise.race([
              gmail.users.messages.get({
                userId: 'me',
                id: message.id!,
                format: 'metadata',
                metadataHeaders: ['From', 'Subject', 'Date']
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 8000))
            ])
            return (detail as any).data
          } catch (error) {
            console.error("Error fetching message details:", error)
            return null
          }
        })
      )

      const validMessages = detailedMessages.filter(Boolean)
      
      if (req.query.summary === 'true') {
        const summary = await generateSummary(validMessages)
        return res.status(200).json({ summary })
      }

      res.status(200).json(validMessages)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.status(405).end()
  }
}