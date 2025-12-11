
import { AppSettings, Chat, ChatMessage, PineXOptions } from '../types';
import { PINEX_SYSTEM_INSTRUCTION_BASE } from "../constants";

// CONFIGURATION:
// Safely access VITE_API_URL to prevent runtime errors if import.meta.env is undefined
const getEnvUrl = () => {
  try {
    // @ts-ignore
    return (import.meta as any).env?.VITE_API_URL;
  } catch {
    return undefined;
  }
};

const ENV_URL = getEnvUrl();
const BASE_URL = ENV_URL ? ENV_URL.replace(/\/$/, '') : '/api';
const PROXY_BASE_URL = `${BASE_URL}/gemini`;

// Helper for making requests
async function postToProxy(endpoint: string, body: any) {
  try {
    const fullUrl = `${PROXY_BASE_URL}${endpoint}`;
    // console.log("Making request to:", fullUrl); // Debugging

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Backend Error (${response.status}): ${errText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Gemini Service Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * transformTextToSemanticHtml
 * Delegates to backend to protect prompts and keys.
 */
export const transformTextToSemanticHtml = async (text: string): Promise<string> => {
  try {
    const data = await postToProxy('/html-convert', { text });
    return data.html || '';
  } catch (error) {
    // Fallback if proxy fails
    return text.split('\n').map(line => `<p>${line}</p>`).join('');
  }
};

/**
 * Calls the proxy to generate a document outline (list of headings/sections).
 * The proxy must use Gemini to process the text and return a string array.
 */
export const generateDocumentOutline = async (text: string): Promise<string[]> => {
    try {
        const data = await postToProxy('/outline-generate', { text });
        // Ensure we always return an array
        return Array.isArray(data.outline) ? data.outline : [];
    } catch (error) {
        console.error("Outline generation failed:", error);
        return [];
    }
};

/**
 * Parses semantic HTML and optimizes it for Speech (TTS).
 * Kept client-side as it uses browser DOMParser and requires no API key.
 */
export const optimizeTableForSpeech = (html: string): string => {
    try {
        if (!html) return "";
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        if (!doc || !doc.body) return html.replace(/<[^>]*>/g, ' ');

        const tables = doc.querySelectorAll('table');
        if (tables.length === 0) return doc.body.innerText || "";

        tables.forEach((table, index) => {
            const rows = Array.from(table.querySelectorAll('tr'));
            if (rows.length === 0) return;

            const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
            const headers = headerCells.map(c => c.textContent?.trim() || '');
            const colCount = headers.length;
            const rowCount = rows.length;

            let narrative = `\n[Table ${index + 1} starting with ${rowCount} rows and ${colCount} columns. `;
            if (headers.length > 0) narrative += `Columns: ${headers.join(', ')}. `;
            narrative += "]\n";

            for (let i = 1; i < rows.length; i++) {
                const cells = Array.from(rows[i].querySelectorAll('td, th'));
                narrative += `Row ${i}: `;
                cells.forEach((cell, cellIndex) => {
                    const header = headers[cellIndex] ? `${headers[cellIndex]}: ` : '';
                    narrative += `${header}${cell.textContent?.trim() || 'Empty'}, `;
                });
                narrative += ".\n";
            }
            narrative += "[End of Table]\n";

            const p = doc.createElement('p');
            p.textContent = narrative;
            table.replaceWith(p);
        });

        return doc.body.innerText || ""; 
    } catch (e) {
        return html ? html.replace(/<[^>]*>/g, ' ') : ""; 
    }
};

/**
 * Creates a Chat Session that proxies messages to the backend.
 * Manages history locally to mimic the SDK's stateful Chat object.
 */
export const createChatSession = (options: PineXOptions): Chat => {
    // Initialize history from options or empty
    const internalHistory = options.history ? [...options.history] : [];
    
    return {
        sendMessage: async (params: { message: string }) => {
            const userMsg = params.message;
            
            // 1. Add User Message to History
            internalHistory.push({ role: 'user', parts: [{ text: userMsg }] });

            // 2. Send to Proxy
            const payload = {
                message: userMsg,
                history: internalHistory,
                context: options.context, // Document content
                enableSearch: options.enableSearch,
                enableThinking: options.enableThinking
            };

            const data = await postToProxy('/chat', payload);

            // 3. Process Response
            const modelResponseText = data.text;
            
            // 4. Add Model Response to History (if text exists)
            if (modelResponseText) {
                internalHistory.push({ role: 'model', parts: [{ text: modelResponseText }] });
            }

            // Return structure matching GenerateContentResponse for ChatBot.tsx
            return {
                text: modelResponseText,
                candidates: data.candidates, // Needed for grounding metadata
                functionCalls: data.functionCalls
            };
        }
    };
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string | undefined> => {
    try {
        const data = await postToProxy('/speech', { text, voiceName });
        return data.audioData; // Base64 string
    } catch (error) {
        console.error("TTS generation failed:", error);
        throw error;
    }
};

export const analyzeImage = async (base64Image: string, mimeType: string): Promise<string> => {
    try {
        const data = await postToProxy('/image-analyze', { image: base64Image, mimeType });
        return data.html;
    } catch (error) {
        return `<p>Error analyzing image.</p>`;
    }
};

export const fetchWebPageContent = async (url: string, targetLanguage: string = 'English'): Promise<{title: string, html: string, text: string}> => {
    try {
        const data = await postToProxy('/web-fetch', { url, targetLanguage });
        return data;
    } catch (error) {
        console.error("Web fetch failed:", error);
        throw new Error("Could not fetch web page content. Please try a different URL.");
    }
};
