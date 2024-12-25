import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, SchemaType, FunctionCallingMode } from "@google/generative-ai";
import { authMiddleware } from '../../../middleware/auth';
import { corsMiddleware } from '../../../middleware/cors';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const flashCardModel = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-exp",
});
const chatModel = genAI.getGenerativeModel({ 
  model: "learnlm-1.5-pro-experimental",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

export async function createFlashCards(topic: string) {
  const chatSession = flashCardModel.startChat({ generationConfig });
  const prompt = `Generate 5 flash cards about ${topic}. 
    Return ONLY a JSON array with this exact format, no extra text or markdown:
    [
      {"question": "Q1 here", "answer": "A1 here"},
      {"question": "Q2 here", "answer": "A2 here"}
    ]`;
    
  try {
    const result = await chatSession.sendMessage(prompt);
    const text = result.response.text();
    // Clean the response to ensure it's valid JSON
    const cleanJSON = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJSON);
  } catch (error) {
    console.error('Error generating flash cards:', error);
    return [{ 
      question: "Error generating cards", 
      answer: "Please try again with a different topic" 
    }];
  }
}

export async function chatWithAI(message: string, context: string) {
  const chatSession = chatModel.startChat({ generationConfig });
  const prompt = `Context: ${context}\n\nUser: ${message}`;
  const result = await chatSession.sendMessage(prompt);
  return result.response.text();
}

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
    const { action, topic, message, context } = req.body;
    if (action === 'createFlashCards') {
      const flashCards = await createFlashCards(topic);
      return res.status(200).json({ flashCards });
    } else if (action === 'chatWithAI') {
      const aiResponse = await chatWithAI(message, context);
      return res.status(200).json({ response: aiResponse });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
