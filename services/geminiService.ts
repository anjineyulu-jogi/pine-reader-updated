
import { AppSettings, Chat, ChatMessage, PineXOptions, ReadingLevel } from '../types';
import { PROXY_BASE_URL } from '../constants';

// Core function to handle communication with the backend proxy
const fetchFromProxy = async (endpoint: string, data: object): Promise<any> => {
  try {
    const fullUrl = `${PROXY_BASE_URL}${endpoint}`;
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      // Attempt to parse error message from JSON, fallback to status text
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || response.statusText;
      throw new Error(`Proxy Error (${response.status}): ${errorMessage}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Gemini Service Error [${endpoint}]:`, error);
    throw error;
  }
};

/**
 * transformTextToSemanticHtml
 * Delegates to backend to protect prompts and keys.
 */
export const transformTextToSemanticHtml = async (text: string, readingLevel: ReadingLevel = ReadingLevel.NORMAL): Promise<string> => {
  try {
    const data = await fetchFromProxy('/html-convert', { text, readingLevel });
    return data.html || '';
  } catch (error) {
    console.error("HTML conversion failed:", error);
    // Fallback if proxy fails: return wrapped text
    return text.split('\n').map(line => `<p>${line}</p>`).join('');
  }
};

/**
 * generateDocumentOutline
 * Calls the proxy to generate a document outline (list of headings).
 */
export const generateDocumentOutline = async (text: string): Promise<string[]> => {
    try {
        const data = await fetchFromProxy('/outline-generate', { text });
        return Array.isArray(data.outline) ? data.outline : [];
    } catch (error) {
        console.error("Outline generation failed:", error);
        return [];
    }
};

/**
 * summarizeSelection
 * Calls the proxy to summarize a block of selected text.
 */
export const summarizeSelection = async (text: string): Promise<string> => {
    try {
        const data = await fetchFromProxy('/summarize', { text });
        return data.summary || "Could not generate summary.";
    } catch (error) {
        console.error("Summarize failed:", error);
        throw new Error("Failed to summarize text. Please try again.");
    }
};

/**
 * optimizeTableForSpeech
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
 * createChatSession
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
            // The proxy endpoint /chat is stateless, so we must send context and history every time.
            const payload = {
                message: userMsg,
                history: internalHistory,
                context: options.context, 
                enableSearch: options.enableSearch,
                enableThinking: options.enableThinking
            };

            const data = await fetchFromProxy('/chat', payload);

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

/**
 * generateSpeech
 * Sends text to the proxy to generate speech audio bytes.
 */
export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string | undefined> => {
    try {
        const data = await fetchFromProxy('/speech', { text, voiceName });
        return data.audioData; // Base64 string
    } catch (error) {
        console.error("TTS generation failed:", error);
        throw error;
    }
};

/**
 * analyzeImage
 * Sends base64 image to proxy for analysis and HTML conversion.
 */
export const analyzeImage = async (base64Image: string, mimeType: string): Promise<string> => {
    try {
        const data = await fetchFromProxy('/image-analyze', { image: base64Image, mimeType });
        return data.html;
    } catch (error) {
        console.error("Image analysis failed:", error);
        return `<p>Error analyzing image content.</p>`;
    }
};

/**
 * fetchWebPageContent
 * Sends URL to proxy for search grounding extraction.
 */
export const fetchWebPageContent = async (url: string, targetLanguage: string = 'English'): Promise<{title: string, html: string, text: string}> => {
    try {
        const data = await fetchFromProxy('/web-fetch', { url, targetLanguage });
        return data;
    } catch (error) {
        console.error("Web fetch failed:", error);
        throw new Error("Could not fetch web page content. Please try a different URL.");
    }
};
