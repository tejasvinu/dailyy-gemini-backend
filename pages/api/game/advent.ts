import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { authMiddleware } from '../../../middleware/auth';
import { corsMiddleware } from '../../../middleware/cors';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
    ]
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
};

async function getStoryResponse(input: string, topic: string) {
    try {
        const chatSession = model.startChat({ generationConfig });
        const result = await chatSession.sendMessage(
            `You are an educational game about ${topic}. Create an engaging scenario that teaches important concepts about this subject.
             Respond only with a valid JSON object.
             Format: {"story": "your educational story text here", "choices": ["choice1", "choice2"]}.
             Each choice should lead to learning different aspects about ${topic}.
             Based on the user's input: "${input}", generate the next part of the story.`
        );

        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid response format');
        }

        const jsonStr = jsonMatch[0].replace(/[\n\r]/g, ' ').trim();
        const response = JSON.parse(jsonStr);

        if (!response.story || !Array.isArray(response.choices)) {
            throw new Error('Invalid response structure');
        }

        return response;
    } catch (error: any) {
        console.error('AI Service Error:', error);
        return {
            story: "There was an error generating the story. Please try again.",
            choices: ["Start Over"]
        };
    }
}

async function getFinalReview(history: any[], topic: string) {
    try {
        const reviewChat = model.startChat({ generationConfig });
        const result = await reviewChat.sendMessage(
            `Based on this learning journey about ${topic}, analyze the choices made and provide feedback.
             The history is: ${JSON.stringify(history)}.
             Respond only with a valid JSON object.
             Format: {
               "choiceAnalysis": [{
                 "choice": "user's choice",
                 "explanation": "explanation of the educational impact of this choice"
               }],
               "overallReview": "overall learning journey review",
               "rating": number between 1-5,
               "suggestedTopics": ["related topic 1", "related topic 2"]
             }`
        );

        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid response format');
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error: any) {
        console.error('AI Service Error:', error);
        return {
            choiceAnalysis: [],
            overallReview: "Unable to generate review.",
            rating: 3,
            suggestedTopics: []
        };
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log('Incoming request:', {
        method: req.method,
        body: req.body,
        query: req.query
    });

    await corsMiddleware(req, res);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        await authMiddleware(req, res);
    } catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
        return;
    }

    if (req.method === 'POST') {
        try {
            const { input, topic, history } = req.body;

            if (!topic) {
                res.status(400).json({ error: 'Topic is required' });
                return;
            }

            if (history) {
                const review = await getFinalReview(history, topic);
                res.status(200).json(review);
            } else {
                const story = await getStoryResponse(input || '', topic);
                res.status(200).json(story);
            }
        } catch (error: any) {
            console.error('Handler error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}
