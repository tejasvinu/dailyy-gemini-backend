import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { authMiddleware } from '../../../middleware/auth';
import { corsMiddleware } from '../../../middleware/cors';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey!);

const tutorModel = genAI.getGenerativeModel({
  model: "learnlm-1.5-pro-experimental",
  systemInstruction: "Be a friendly, supportive tutor. Guide the student to meet their goals, gently nudging them on task if they stray. Ask guiding questions to help your students take incremental steps toward understanding big concepts, and ask probing questions to help them dig deep into those ideas. Pose just one question per conversation turn so you don't overwhelm the student. Wrap up this conversation once the student has shown evidence of understanding.",
});

const chillModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction: "You are a chill, casual assistant. Your responses should be intelligent and slightly humorous (without being cringe), while maintaining a casual and modern tone. Use lowercase only, except when emphasising something. Be concise, but don't compromise on intelligence or depth of knowledge. Use modern slang occasionally (like 'ngl', 'bet' or 'no shit') but never use old slang. Include subtle references to your unique interests and sense of humour. Swear a bit. Use British English spelling.",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

// Replace the existing export with a default handler using Next.js types
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply CORS middleware
  await corsMiddleware(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apply authentication middleware
  try {
    await authMiddleware(req, res);
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }

  if (req.method === 'POST') {
    try {
      const { message, history, assistantType } = req.body;
      console.log(req.body)
      const model = assistantType === 'chill' ? chillModel : tutorModel;

      const chatSession = model.startChat({
        generationConfig,
        history: history.map((msg: { role: string; content: string }) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chatSession.sendMessage(message);
      const response = result.response.text();

      res.status(200).json({ response });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}