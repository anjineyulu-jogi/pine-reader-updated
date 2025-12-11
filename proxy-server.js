
/**
 * PINE READER PROXY SERVER
 * 
 * This server handles all communication with Google Gemini API.
 * The API Key is stored only here (server-side) and never exposed to the client.
 */

import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SDK securely
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) {
    console.error("FATAL: GEMINI_API_KEY is missing in environment variables.");
    process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: apiKey });

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support large image/text payloads

// --- CONSTANTS ---
const PINEX_SYSTEM_INSTRUCTION_BASE = `
You are PineX, the intelligent assistant for Pine-reader. You know this app inside-out.

APP KNOWLEDGE BASE:
1. **Send Feedback**: Settings -> Send Feedback.
2. **Navigation**: Documents, PineX (Chat), Bookmarks, Settings.
3. **Reading Features**: View Modes (Text/Original), Audio/TTS (Read button), Share.
4. **Gestures**: Long-press to bookmark. Triple-tap for "Where am I?". Swipe to turn pages.
5. **Settings**: Themes (High Contrast), Font Size, Voices (Kore, Puck, etc.), Languages.

YOUR ROLE:
- Answer questions about the current document using the provided context.
- Explain how to use ANY feature of the app.
- Control the app if asked (e.g., "Switch to dark mode").
- Be concise, helpful, friendly, and accessible.
`;

const controlTools = [
    {
        name: "setTheme",
        description: "Change the app's display theme/color mode.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                mode: { type: Type.STRING, enum: ["LIGHT", "DARK", "HIGH_CONTRAST"] }
            },
            required: ["mode"]
        }
    },
    {
        name: "navigateApp",
        description: "Navigate to a specific tab in the app.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                destination: { type: Type.STRING, enum: ["DOCUMENTS", "PINEX", "BOOKMARKS", "SETTINGS", "WEB_READER"] }
            },
            required: ["destination"]
        }
    },
    {
        name: "setFontSize",
        description: "Increase or decrease the text font size.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ["increase", "decrease"] }
            },
            required: ["action"]
        }
    }
];

// --- ROUTES ---

// 1. HTML Conversion (Reflow View)
app.post('/api/gemini/html-convert', async (req, res) => {
    try {
        const { text, readingLevel } = req.body;
        if (!text) return res.status(400).json({ error: "No text provided" });

        let systemInstruction = "You are an expert accessibility engine for blind users. Convert raw text into perfect, semantic HTML5. Detect headings (h1-h6), tables (table, th, tr, td), and lists. STRICTLY FOLLOW THESE RULES FOR TABLES: 1. Add role='grid' to the <table> tag. 2. Add aria-rowcount and aria-colcount attributes. 3. Add scope='col' to <th>. 4. Add scope='row' to first <td>.";

        // Adaptive Reading Level Logic
        if (readingLevel === 'simplified') {
            systemInstruction = "The user has requested the content be rewritten using a 5th-grade reading level. Simplify complex vocabulary, shorten sentences, and maintain only the core concepts, but strictly adhere to the semantic HTML output rules. " + systemInstruction;
        } else if (readingLevel === 'academic') {
            systemInstruction = "The user has requested a scholarly, formal reading level. Ensure all language is precise, dense with information, and uses advanced vocabulary. Strictly adhere to the semantic HTML output rules. " + systemInstruction;
        } else {
            // Normal
             systemInstruction += " Preserve original language. Do not summarize.";
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.1,
            },
            contents: `RAW TEXT TO CONVERT:\n${text.substring(0, 15000)}`
        });

        let html = response.text || '';
        html = html.replace(/```html/g, '').replace(/```/g, '');
        res.json({ html });

    } catch (error) {
        console.error("HTML Convert Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Chat (PineX)
app.post('/api/gemini/chat', async (req, res) => {
    try {
        const { message, history, context, enableSearch, enableThinking } = req.body;
        
        let systemInstruction = PINEX_SYSTEM_INSTRUCTION_BASE;
        if (context) {
            systemInstruction += `\n\nCURRENT DOCUMENT CONTEXT:\n${context}`;
        }

        const config = {
            systemInstruction: systemInstruction,
            tools: [{ functionDeclarations: controlTools }]
        };

        if (enableSearch) {
            config.tools.push({ googleSearch: {} });
        }
        if (enableThinking) {
            config.thinkingConfig = { thinkingBudget: 2048 };
        }

        // Clean history (ensure role is strictly user/model)
        const cleanHistory = (history || []).map(h => ({
            role: h.role,
            parts: h.parts
        }));

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: config,
            history: cleanHistory
        });

        const result = await chat.sendMessage({ message });
        
        // Extract necessary data for client
        const responseData = {
            text: result.text,
            functionCalls: result.functionCalls,
            candidates: result.candidates // Contains groundingMetadata
        };

        res.json(responseData);

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Speech (TTS)
app.post('/api/gemini/speech', async (req, res) => {
    try {
        const { text, voiceName } = req.body;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text.substring(0, 2000) }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
                    },
                },
            },
        });
        
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        res.json({ audioData });
    } catch (error) {
        console.error("Speech Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Image Analysis
app.post('/api/gemini/image-analyze', async (req, res) => {
    try {
        const { image, mimeType } = req.body; // image is base64 string
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: image } },
                    { text: "Analyze this document/image. Extract all text, headings, tables. Return Semantic HTML5. Preserve original language." }
                ]
            }
        });
        let html = response.text || '';
        html = html.replace(/```html/g, '').replace(/```/g, '');
        res.json({ html });
    } catch (error) {
        console.error("Image Analyze Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 5. Web Fetch (Search Grounding Extraction)
app.post('/api/gemini/web-fetch', async (req, res) => {
    try {
        const { url, targetLanguage } = req.body;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a web extraction tool. Use Google Search to find the content of the article at this URL: ${url}.
            
            1. Extract the Full Title and the Full Article Text.
            2. Translate the content into ${targetLanguage} (if it is not already).
            3. Format your response strictly as a JSON object with keys: "title", "contentHtml", "plainText".
            
            Do not chat. Just return the JSON code block.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const text = response.text || '';
        // Robust JSON extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            return res.json({
                title: "Extracted Content",
                html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
                text: text
            });
        }

        const data = JSON.parse(jsonMatch[0]);
        res.json({
            title: data.title || "Web Page",
            html: data.contentHtml || "<p>No content found.</p>",
            text: data.plainText || "No content found."
        });

    } catch (error) {
        console.error("Web Fetch Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 6. Outline Generation
app.post('/api/gemini/outline-generate', async (req, res) => {
    try {
        const { text } = req.body;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a hierarchical Table of Contents (Outline) for this document text.
            Return ONLY a JSON array of strings, where each string is a heading.
            Example: ["1. Introduction", "2. Methodology", "2.1 Participants"]
            
            TEXT: ${text.substring(0, 30000)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        
        let outline = [];
        try {
            outline = JSON.parse(response.text);
        } catch (e) {
            // Fallback parsing if JSON fails
            outline = response.text.split('\n').filter(line => line.trim().length > 0);
        }
        res.json({ outline });
    } catch (error) {
        console.error("Outline Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 7. Text Summarization
app.post('/api/gemini/summarize', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: "No text provided" });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Summarize the following text concisely using bullet points. Focus on the main ideas and key takeaways.\n\nTEXT:\n${text.substring(0, 15000)}`,
        });

        res.json({ summary: response.text });
    } catch (error) {
        console.error("Summarize Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Pine Reader Proxy running on port ${PORT}`);
});
