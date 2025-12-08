
import { GoogleGenAI, Chat, Modality, Content, FunctionDeclaration, Type } from "@google/genai";
import { PINEX_SYSTEM_INSTRUCTION_BASE } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * transformTextToSemanticHtml
 */
export const transformTextToSemanticHtml = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are an expert accessibility engine for blind users. Convert raw text into perfect, semantic HTML5. Detect headings (h1-h6), tables (table, th, tr, td), and lists. STRICTLY FOLLOW THESE RULES FOR TABLES: 1. Add role='grid' to the <table> tag. 2. Add aria-rowcount and aria-colcount attributes to the <table> tag (estimate counts if needed). 3. Add scope='col' to <th> cells. 4. Add scope='row' to the first <td> cell in every <tr> of the <tbody>. Do not summarize.",
        temperature: 0.1,
      },
      contents: `RAW TEXT TO CONVERT:\n${text.substring(0, 15000)}` 
    });

    let html = response.text || '';
    html = html.replace(/```html/g, '').replace(/```/g, '');
    return html;

  } catch (error) {
    console.error("Gemini HTML generation failed:", error);
    return text.split('\n').map(line => `<p>${line}</p>`).join('');
  }
};

/**
 * Parses semantic HTML and optimized it for Speech (TTS).
 */
export const optimizeTableForSpeech = (html: string): string => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const tables = doc.querySelectorAll('table');

        if (tables.length === 0) return doc.body.innerText;

        tables.forEach((table, index) => {
            const rows = Array.from(table.querySelectorAll('tr'));
            if (rows.length === 0) return;

            const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
            const headers = headerCells.map(c => c.textContent?.trim() || '');
            const colCount = headers.length;
            const rowCount = rows.length;

            let narrative = `\n[Table ${index + 1} starting with ${rowCount} rows and ${colCount} columns. `;
            if (headers.length > 0) {
                narrative += `Columns: ${headers.join(', ')}. `;
            }
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

        return doc.body.innerText; 
    } catch (e) {
        return html.replace(/<[^>]*>/g, ' '); 
    }
};

export interface PineXOptions {
  enableSearch?: boolean;
  enableThinking?: boolean;
  context?: string;
  history?: Content[];
}

const controlTools: FunctionDeclaration[] = [
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

export const createChatSession = (options: PineXOptions): Chat => {
    let systemInstruction = PINEX_SYSTEM_INSTRUCTION_BASE;
    if (options.context) {
        systemInstruction += `\n\nCURRENT DOCUMENT CONTEXT:\n${options.context}`;
    }

    const config: any = {
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: controlTools }]
    };

    if (options.enableSearch) {
        if (!config.tools) config.tools = [];
        config.tools.push({ googleSearch: {} });
    }

    if (options.enableThinking) {
        config.thinkingConfig = { thinkingBudget: 2048 }; 
    }

    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: config,
        history: options.history
    });
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string | undefined> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text.substring(0, 2000) }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName }, 
                    },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) {
        console.error("TTS generation failed:", error);
        throw error;
    }
};

export const analyzeImage = async (base64Image: string, mimeType: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: base64Image } },
                    { text: "Analyze this document/image. Extract all text, headings, tables. Return Semantic HTML5." }
                ]
            }
        });
        let html = response.text || '';
        html = html.replace(/```html/g, '').replace(/```/g, '');
        return html;
    } catch (error) {
        return `<p>Error analyzing image.</p>`;
    }
};

/**
 * Fetch Web Page Content using Gemini 2.5 Flash with Google Search
 * Robust rewrite to handle model refusals and formatting issues.
 */
export const fetchWebPageContent = async (url: string): Promise<{title: string, html: string, text: string}> => {
    try {
        // Use a "Search and Extract" strategy instead of "Browse to" to avoid capability refusals
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a web extraction tool. Use Google Search to find the content of the article at this URL: ${url}.
            
            Extract the Full Title and the Full Article Text. 
            Format your response strictly as a JSON object with these keys:
            "title": The article title.
            "contentHtml": The full text formatted as accessible Semantic HTML (h1, p, ul, table).
            "plainText": The full plain text.

            Do not chat. Do not apologize. Just return the JSON code block.`,
            config: {
                tools: [{ googleSearch: {} }] 
            }
        });

        const text = response.text || '';
        if (!text) throw new Error("No content returned.");

        // Robust JSON extraction using Regex to bypass conversational filler
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            // Fallback: Model returned text but not JSON. Let's assume it's the article content.
            return {
                title: "Extracted Content",
                html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
                text: text
            };
        }

        const cleanJson = jsonMatch[0];
        const data = JSON.parse(cleanJson);
        
        return {
            title: data.title || "Web Page",
            html: data.contentHtml || "<p>No content found.</p>",
            text: data.plainText || "No content found."
        };
    } catch (error) {
        console.error("Web fetch failed:", error);
        throw new Error("Could not fetch web page content. Please try a different URL.");
    }
};
