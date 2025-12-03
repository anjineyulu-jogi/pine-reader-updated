
import { GoogleGenAI, Chat, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * transformTextToSemanticHtml
 */
export const transformTextToSemanticHtml = async (text: string): Promise<string> => {
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
    // Clean markdown code blocks if present
    html = html.replace(/```html/g, '').replace(/```/g, '');
    return html;

  } catch (error) {
    console.error("Gemini HTML generation failed:", error);
    // Fallback to basic paragraph wrapping
    return text.split('\n').map(line => `<p>${line}</p>`).join('');
  }
};

/**
 * Create a chat session for PineX
 * Using gemini-2.5-flash for speed and reliability
 */
export const createChatSession = (context?: string): Chat => {
    let systemInstruction = "You are PineX, an intelligent assistant for the Pine-reader app. You help blind users understand documents. Answer concisely. Do not use markdown tables, use lists instead.";
    
    if (context) {
        systemInstruction += `\n\nCONTEXT FROM CURRENT DOCUMENT PAGE:\n${context.substring(0, 30000)}`;
    }

    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        }
    });
};

/**
 * Generate Speech using Gemini 2.5 Flash TTS
 */
export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string | undefined> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text.substring(0, 2000) }] }], // Limit char count for latency
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName }, 
                    },
                },
            },
        });
        
        // Return base64 encoded audio
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) {
        console.error("TTS generation failed:", error);
        throw error;
    }
};

/**
 * Analyze Image using Gemini 3 Pro
 */
export const analyzeImage = async (base64Image: string, mimeType: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Image
                        }
                    },
                    {
                        text: "Analyze this document/image. Extract all text, headings, tables, and describe any visual elements in detail. Return the result as Semantic HTML5 suitable for a blind reader."
                    }
                ]
            }
        });
        
        let html = response.text || '';
        html = html.replace(/```html/g, '').replace(/```/g, '');
        return html;
    } catch (error) {
        console.error("Image analysis failed:", error);
        return `<p>Error analyzing image. Please try again.</p>`;
    }
};
