import { GoogleGenAI, Chat } from "@google/genai";

// User provided key as fallback.
const USER_KEY = 'AIzaSyBtu4ccARhytrv0oBgXdZC_qmFu5rD8E9g';

// Safely get API key in both Node and Vite environments
const getApiKey = () => {
  // Check for Vite env
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {}

  // Check for Node env
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {}

  return USER_KEY;
};

const apiKey = getApiKey();

const ai = new GoogleGenAI({ apiKey });

/**
 * transformTextToSemanticHtml
 */
export const transformTextToSemanticHtml = async (text: string): Promise<string> => {
  if (!apiKey) {
    return `<p>Error: API Key missing.</p><p>${text}</p>`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are an expert accessibility engine for blind users. Convert raw text into perfect, semantic HTML5. Detect headings (h1-h6), tables (table, th, tr, td), and lists. Do not summarize.",
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
 * Create a chat session for PineX
 * Using gemini-2.5-flash for speed and reliability (avoids ContentUnion errors on some inputs)
 */
export const createChatSession = (context?: string): Chat => {
    let systemInstruction = "You are PineX, an intelligent assistant for the Pine-reader app. You help blind users understand documents. Answer concisely. Do not use markdown tables, use lists instead.";
    
    if (context) {
        systemInstruction += `\n\nCONTEXT FROM CURRENT DOCUMENT PAGE:\n${context.substring(0, 20000)}`;
    }

    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        }
    });
};