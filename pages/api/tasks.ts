
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Implement your own task logic here
    return res.status(200).json({ tasks: [] })
  }
  res.status(405).end()
}