import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory, Tool, SchemaType, FunctionCallingMode } from "@google/generative-ai";
import { authMiddleware } from '../../../middleware/auth';
import { corsMiddleware } from '../../../middleware/cors';
import Note from '../../../models/Note';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey!);

// Note management functions
async function createNote(content: string, userId: string) {
    console.log('createNote called with:', { content, userId });
    try {
        const note = new Note({
            content,
            user: userId,
            status: 'active'
        });
        const savedNote = await note.save();
        console.log('Note created:', savedNote);
        return JSON.stringify(savedNote);
    } catch (error: any) {
        console.error('createNote error:', error);
        return JSON.stringify({ error: error.message });
    }
}

async function deleteNote(noteId: string, userId: string) {
    console.log('deleteNote called with:', { noteId, userId });
    try {
        const result = await Note.findOneAndDelete({ _id: noteId, user: userId });
        if (!result) {
            console.log('Note not found or unauthorized');
            return JSON.stringify({ error: 'Note not found or unauthorized' });
        }
        console.log('Note deleted:', result);
        return JSON.stringify({ message: 'Note deleted', noteId });
    } catch (error: any) {
        console.error('deleteNote error:', error);
        return JSON.stringify({ error: error.message });
    }
}

async function updateNoteStatus(noteId: string, userId: string, status: string) {
    console.log('updateNoteStatus called with:', { noteId, userId, status });
    try {
        const updatedNote = await Note.findOneAndUpdate(
            { _id: noteId, user: userId },
            { status },
            { new: true }
        );
        if (!updatedNote) {
            console.log('Note not found or unauthorized');
            return JSON.stringify({ error: 'Note not found or unauthorized' });
        }
        console.log('Note updated:', updatedNote);
        return JSON.stringify(updatedNote);
    } catch (error: any) {
        console.error('updateNoteStatus error:', error);
        return JSON.stringify({ error: error.message });
    }
}

async function viewNotes(userId: string) {
    console.log('viewNotes called with userId:', userId);
    try {
        const notes = await Note.find({ user: userId });
        console.log('Notes found:', notes.length);
        return JSON.stringify(notes);
    } catch (error: any) {
        console.error('viewNotes error:', error);
        return JSON.stringify({ error: error.message });
    }
}

// Update tool declarations to be more explicit about user context
const toolDeclarations: Tool[] = [
    {
        functionDeclarations: [
            {
                name: "viewNotes",
                description: "Retrieves all notes for the authenticated user. No parameters needed as it uses the current user's context.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        _dummy: {  // Add a dummy property to satisfy API requirement
                            type: SchemaType.STRING,
                            description: "Dummy parameter (not used)"
                        }
                    },
                    required: [], // Keep it empty since the parameter is not required
                },
            },
            {
                name: "createNote",
                description: "Creates a new note for the authenticated user",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        content: {
                            type: SchemaType.STRING,
                            description: "The content of the note to be created for the current user",
                        },
                    },
                    required: ["content"],
                },
            },
            {
                name: "deleteNote",
                description: "Deletes a note by ID for the authenticated user",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        noteId: {
                            type: SchemaType.STRING,
                            description: "The ID of the note to delete for the current user",
                        },
                    },
                    required: ["noteId"],
                },
            },
            {
                name: "updateNoteStatus",
                description: "Updates a note's status for the authenticated user",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        noteId: {
                            type: SchemaType.STRING,
                            description: "The ID of the note to update for the current user",
                        },
                        status: {
                            type: SchemaType.STRING,
                            description: "The new status (active or completed)",
                            enum: ["active", "completed"],
                        },
                    },
                    required: ["noteId", "status"],
                },
            }
        ]
    }
];

const tutorModel = genAI.getGenerativeModel({
    model: "learnlm-1.5-pro-experimental",
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
    ],
    systemInstruction: `Be a friendly, supportive tutor. You have access to the authenticated user's notes. 
    Always ensure the user explicitly provides the content when creating a note. If content is missing, 
    please ask them to clarify before calling createNote.`,
    tools: toolDeclarations,
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
});

const chillModel = genAI.getGenerativeModel({
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
    ],
    systemInstruction: {
        role: "model",
        parts: [{
            text: `you're a chill assistant with access to the user's personal notes. whenever creating a note, 
            insist on explicit content from the user. if it's not provided, ask them first before calling createNote. 
            keep your casual tone, but confirm they specify what to store in the note.`
        }],
    },
    tools: toolDeclarations,
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
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
            const userId = (req as any).user.userId;
            const model = assistantType === 'chill' ? chillModel : tutorModel;

            const chatSession = model.startChat({
                generationConfig,
                history: history.map((msg: { role: string; content: string }) => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }],
                })),
            });

            const result = await chatSession.sendMessage(message);
            const response = result.response;

            // Process tool calls
            if (response.candidates && response.candidates[0].content.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.functionCall) {
                        console.log('Function call detected:', part.functionCall);
                        const functionName = part.functionCall.name;
                        const args = part.functionCall.args as any;

                        let functionResponse;
                        switch (functionName) {
                            case 'viewNotes':
                                console.log('Calling viewNotes');
                                functionResponse = await viewNotes(userId);
                                break;
                            case 'createNote':
                                console.log('Calling createNote');
                                functionResponse = await createNote(args.content, userId);
                                break;
                            case 'deleteNote':
                                console.log('Calling deleteNote');
                                functionResponse = await deleteNote(args.noteId, userId);
                                break;
                            case 'updateNoteStatus':
                                console.log('Calling updateNoteStatus');
                                functionResponse = await updateNoteStatus(args.noteId, userId, args.status);
                                break;
                            default:
                                console.log('Unknown function:', functionName);
                                functionResponse = null;
                                break;
                        }

                        if (functionResponse) {
                            console.log('Function response:', functionResponse);
                            const functionResult = await chatSession.sendMessage([{
                                functionResponse: {
                                    name: functionName,
                                    response: {
                                        content: JSON.parse(functionResponse)
                                    }
                                }
                            }]);

                            return res.status(200).json({
                                response: functionResult.response.text(),
                                functionCall: {
                                    name: functionName,
                                    result: JSON.parse(functionResponse)
                                }
                            });
                        }
                    }
                }
            }

            res.status(200).json({ response: response.text() });
        } catch (error: any) {
            console.error('Handler error:', error);
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}