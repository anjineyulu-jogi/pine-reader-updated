
/**
 * PINE READER FIREBASE FUNCTIONS
 * Deploy this file to Firebase to secure your API Key.
 */

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const express = require('express');
const cors = require('cors');
const { GoogleGenAI, Modality, Type } = require('@google/genai');

// Set region (optional, choose one close to your users)
setGlobalOptions({ region: "us-central1" });

const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// --- CONFIGURATION ---
// Access API Key from Firebase Secrets or Environment
// Run: firebase functions:secrets:set GEMINI_API_KEY
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

let ai;
if (apiKey) {
    ai = new GoogleGenAI({ apiKey: apiKey });
} else {
    console.error("GEMINI_API_KEY is not set.");
}

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

// --- ROUTES (Mapped to /gemini/...) ---

// 1. HTML Conversion
app.post('/gemini/html-convert', async (req, res) => {
    if (!ai) return res.status(500).json({ error: "API Key not configured" });
    try {
        const { text } = req.body;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are an expert accessibility engine for blind users. Convert raw text into perfect, semantic HTML5. Detect headings (h1-h6), tables (table, th, tr, td), and lists. STRICTLY FOLLOW THESE RULES FOR TABLES: 1. Add role='grid' to the <table> tag. 2. Add aria-rowcount and aria-colcount attributes. 3. Add scope='col' to <th>. 4. Add scope='row' to first <td>. Preserve original language. Do not summarize.",
                temperature: 0.1,
            },
            contents: `RAW TEXT TO CONVERT:\n${text.substring(0, 15000)}`
        });
        let html = response.text || '';
        html = html.replace(/```html/g, '').replace(/```/g, '');
        res.json({ html });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Chat
app.post('/gemini/chat', async (req, res) => {
    if (!ai) return res.status(500).json({ error: "API Key not configured" });
    try {
        const { message, history, context, enableSearch, enableThinking } = req.body;
        let systemInstruction = PINEX_SYSTEM_INSTRUCTION_BASE;
        if (context) systemInstruction += `\n\nCURRENT DOCUMENT CONTEXT:\n${context}`;

        const config = {
            systemInstruction: systemInstruction,
            tools: [{ functionDeclarations: controlTools }]
        };

        if (enableSearch) config.tools.push({ googleSearch: {} });
        if (enableThinking) config.thinkingConfig = { thinkingBudget: 2048 };

        const cleanHistory = (history || []).map(h => ({ role: h.role, parts: h.parts }));

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: config,
            history: cleanHistory
        });

        const result = await chat.sendMessage({ message });
        res.json({
            text: result.text,
            functionCalls: result.functionCalls,
            candidates: result.candidates
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Speech
app.post('/gemini/speech', async (req, res) => {
    if (!ai) return res.status(500).json({ error: "API Key not configured" });
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
        res.json({ audioData: response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Image Analyze
app.post('/gemini/image-analyze', async (req, res) => {
    if (!ai) return res.status(500).json({ error: "API Key not configured" });
    try {
        const { image, mimeType } = req.body;
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
        res.status(500).json({ error: error.message });
    }
});

// 5. Web Fetch
app.post('/gemini/web-fetch', async (req, res) => {
    if (!ai) return res.status(500).json({ error: "API Key not configured" });
    try {
        const { url, targetLanguage } = req.body;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a web extraction tool. Use Google Search to find the content of the article at this URL: ${url}.
            1. Extract the Full Title and the Full Article Text.
            2. Translate the content into ${targetLanguage} (if it is not already).
            3. Format your response strictly as a JSON object with keys: "title", "contentHtml", "plainText".`,
            config: { tools: [{ googleSearch: {} }] }
        });

        const text = response.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.json({ title: "Content", html: `<p>${text}</p>`, text: text });
        }
        res.json(JSON.parse(jsonMatch[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Expose the Express App as a single Cloud Function named 'api'
exports.api = onRequest({ secrets: ["GEMINI_API_KEY"] }, app);
