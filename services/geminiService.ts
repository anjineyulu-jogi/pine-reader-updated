
import { GoogleGenAI, Modality, Type, FunctionDeclaration, LiveServerMessage } from "@google/genai";
import { AppSettings, Chat, ChatMessage, PineXOptions, ReadingLevel, Content } from '../types';
import { PINEX_SYSTEM_INSTRUCTION_BASE } from '../constants';

// Initialize the SDK directly with the Environment Variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Pine-X Control Tools Definition ---
export const PineXToolDeclarations: FunctionDeclaration[] = [
    {
        name: 'execute_app_action',
        description: 'Executes a command to control the application state, navigation, settings, or TTS.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: {
                    type: Type.STRING,
                    description: 'The type of action to perform. Must be one of: NAVIGATE, SET_SETTING, TTS_CONTROL, SHARE.',
                },
                payload: {
                    type: Type.OBJECT,
                    description: 'A JSON object containing the parameters for the specific action.',
                    properties: {
                        tab: {
                            type: Type.STRING,
                            description: 'The tab ID to navigate to (e.g., DOCUMENTS, BOOKMARKS, SETTINGS). Only used for NAVIGATE.',
                        },
                        pageNumber: {
                            type: Type.INTEGER,
                            description: 'The 1-based page number to jump to. Only used for NAVIGATE.',
                        },
                        key: {
                            type: Type.STRING,
                            description: 'The AppSetting key to modify (e.g., colorMode, fontSize, speechRate). Only used for SET_SETTING.',
                        },
                        value: {
                            type: Type.STRING,
                            description: 'The new value for the setting key.',
                        },
                        command: {
                            type: Type.STRING,
                            description: 'The TTS control command (e.g., PLAY, PAUSE, FORWARD, BACK, STOP, RESUME). Only used for TTS_CONTROL.',
                        },
                        text: {
                            type: Type.STRING,
                            description: 'The text content to share. Only used for SHARE.',
                        },
                    },
                },
            },
            required: ['action', 'payload'],
        },
    },
];

// --- LIVE API IMPLEMENTATION ---

// Helper types for Audio Processing
interface LiveSessionCallbacks {
    onConnect: () => void;
    onDisconnect: () => void;
    onError: (e: Error) => void;
    onAudioLevel: (level: number) => void; // For visualizer
}

// PCM Audio Helpers
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output.buffer;
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * startLiveSession
 * Initiates a bidirectional audio stream with Gemini Live.
 */
export const startLiveSession = async (
    callbacks: LiveSessionCallbacks,
    voiceName: string = 'Zephyr',
    context: string = ''
): Promise<() => void> => {
    let audioContext: AudioContext | null = null;
    let inputSource: MediaStreamAudioSourceNode | null = null;
    let processor: ScriptProcessorNode | null = null;
    let stream: MediaStream | null = null;
    let nextStartTime = 0;
    let isConnected = false;
    
    // Cleanup function
    const cleanup = () => {
        isConnected = false;
        if (processor) { processor.disconnect(); processor = null; }
        if (inputSource) { inputSource.disconnect(); inputSource = null; }
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        if (audioContext) { audioContext.close(); audioContext = null; }
        callbacks.onDisconnect();
    };

    try {
        // 1. Setup Audio Contexts
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        // 2. Setup Input Stream (Mic)
        stream = await navigator.mediaDevices.getUserMedia({ audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000 // Gemini expects 16k input
        }});
        
        // 3. Connect to Gemini Live
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
                },
                systemInstruction: PINEX_SYSTEM_INSTRUCTION_BASE + (context ? `\n\nCONTEXT:\n${context}` : ""),
            },
            callbacks: {
                onopen: async () => {
                    isConnected = true;
                    callbacks.onConnect();
                    
                    // Start Recording Loop
                    if (!audioContext || !stream) return;
                    
                    // Using ScriptProcessor for broad compatibility (AudioWorklet is cleaner but more complex setup in single-file bundlers)
                    const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                    inputSource = inputContext.createMediaStreamSource(stream);
                    processor = inputContext.createScriptProcessor(4096, 1, 1);
                    
                    processor.onaudioprocess = (e) => {
                        if (!isConnected) return;
                        const inputData = e.inputBuffer.getChannelData(0);
                        
                        // Calculate volume level for visualizer
                        let sum = 0;
                        for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                        const rms = Math.sqrt(sum / inputData.length);
                        callbacks.onAudioLevel(rms); // Send level (0-1)

                        // Convert to 16-bit PCM for Gemini
                        const pcm16 = floatTo16BitPCM(inputData);
                        const base64Audio = arrayBufferToBase64(pcm16);
                        
                        sessionPromise.then(session => {
                            session.sendRealtimeInput({
                                media: {
                                    mimeType: 'audio/pcm;rate=16000',
                                    data: base64Audio
                                }
                            });
                        });
                    };
                    
                    inputSource.connect(processor);
                    processor.connect(inputContext.destination);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && audioContext) {
                        const audioBytes = base64ToUint8Array(audioData);
                        
                        // Decode raw PCM from Gemini (24kHz)
                        const pcmData = new Int16Array(audioBytes.buffer);
                        const float32Data = new Float32Array(pcmData.length);
                        for (let i = 0; i < pcmData.length; i++) {
                            float32Data[i] = pcmData[i] / 32768.0;
                        }
                        
                        const buffer = audioContext.createBuffer(1, float32Data.length, 24000);
                        buffer.copyToChannel(float32Data, 0);

                        const source = audioContext.createBufferSource();
                        source.buffer = buffer;
                        source.connect(audioContext.destination);
                        
                        const now = audioContext.currentTime;
                        // Schedule next chunk
                        const start = Math.max(now, nextStartTime);
                        source.start(start);
                        nextStartTime = start + buffer.duration;
                    }
                    
                    if (msg.serverContent?.interrupted) {
                         nextStartTime = 0;
                    }
                },
                onclose: () => {
                    cleanup();
                },
                onerror: (e) => {
                    console.error("Gemini Live Error", e);
                    callbacks.onError(new Error("Connection error"));
                    cleanup();
                }
            }
        });

        return cleanup;

    } catch (error) {
        console.error("Failed to start Live Session", error);
        callbacks.onError(error as Error);
        cleanup();
        return () => {};
    }
};

/**
 * transformTextToSemanticHtml
 * Converts raw text to accessible HTML using Gemini.
 */
export const transformTextToSemanticHtml = async (text: string, readingLevel: ReadingLevel = ReadingLevel.NORMAL): Promise<string> => {
  try {
    let systemInstruction = "You are an expert accessibility engine for blind users. Convert raw text into perfect, semantic HTML5. Detect headings (h1-h6), tables (table, th, tr, td), and lists. STRICTLY FOLLOW THESE RULES FOR TABLES: 1. Add role='grid' to the <table> tag. 2. Add aria-rowcount and aria-colcount attributes. 3. Add scope='col' to <th>. 4. Add scope='row' to first <td>.";

    if (readingLevel === ReadingLevel.SIMPLIFIED) {
        systemInstruction = "The user has requested the content be rewritten using a 5th-grade reading level. Simplify complex vocabulary, shorten sentences, and maintain only the core concepts, but strictly adhere to the semantic HTML output rules. " + systemInstruction;
    } else if (readingLevel === ReadingLevel.ACADEMIC) {
        systemInstruction = "The user has requested a scholarly, formal reading level. Ensure all language is precise, dense with information, and uses advanced vocabulary. Strictly adhere to the semantic HTML output rules. " + systemInstruction;
    } else {
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
    return html;
  } catch (error) {
    console.error("HTML conversion failed:", error);
    return text.split('\n').map(line => `<p>${line}</p>`).join('');
  }
};

/**
 * generateDocumentOutline
 * Generates a table of contents using JSON mode.
 */
export const generateDocumentOutline = async (text: string): Promise<string[]> => {
    try {
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
        
        const jsonStr = response.text;
        return jsonStr ? JSON.parse(jsonStr) : [];
    } catch (error) {
        console.error("Outline generation failed:", error);
        return [];
    }
};

/**
 * summarizeSelection
 * Summarizes specific text.
 */
export const summarizeSelection = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Summarize the following text concisely using bullet points. Focus on the main ideas and key takeaways.\n\nTEXT:\n${text.substring(0, 15000)}`,
        });
        return response.text || "Could not generate summary.";
    } catch (error) {
        console.error("Summarize failed:", error);
        throw new Error("Failed to summarize text.");
    }
};

/**
 * summarizeText
 * Generates a two-sentence summary for bookmarks.
 */
export const summarizeText = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `You are an expert summarization tool. Your goal is to provide a concise, two-sentence summary of the user-provided text. Focus on the main topic and key takeaway. Return only the summary text, do not chat or apologize.`,
                temperature: 0.2,
            },
            contents: `TEXT TO SUMMARIZE: ${text.substring(0, 10000)}`
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Gemini summarization failed:", error);
        return "AI Summary Unavailable.";
    }
};

/**
 * getSemanticLookup
 * Provides a quick lookup definition.
 */
export const getSemanticLookup = async (text: string, context: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `You are an instant definition and context tool. Based on the surrounding document context, provide a single, concise sentence that defines the selected phrase. Prioritize clarity and brevity. Return only the sentence.`,
                temperature: 0.1,
            },
            contents: [
                { role: 'user', parts: [{ text: `DOCUMENT CONTEXT: ${context.substring(0, 5000)}` }] },
                { role: 'user', parts: [{ text: `SELECTED PHRASE: ${text}` }] }
            ]
        });
        return response.text?.trim() || "Could not retrieve definition.";
    } catch (error) {
        console.error("Gemini lookup failed:", error);
        return "Could not retrieve definition.";
    }
};

/**
 * translateSemanticHtml
 * Translates web content to target language.
 */
export const translateSemanticHtml = async (htmlContent: string, targetLanguage: string): Promise<{title: string, html: string}> => {
    try {
        const prompt = `Translate the following HTML content, including all text within tags (h1, p, li, td, etc.), into ${targetLanguage}. Preserve all HTML structure, tags, and accessibility attributes exactly as they are. Only translate the visible text. Return ONLY the translated HTML content (do not wrap it in a code block or add any conversational text).`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: prompt,
                temperature: 0.1,
            },
            contents: htmlContent
        });

        let translatedHtml = response.text || '';
        translatedHtml = translatedHtml.replace(/```html/g, '').replace(/```/g, '');
        
        const titleResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `Extract and translate the main title from the following HTML into ${targetLanguage}. Return only the translated title text.`,
                temperature: 0.1,
            },
            contents: htmlContent.substring(0, 2000)
        });
        
        return {
            title: titleResponse.text?.trim() || 'Translated Article',
            html: translatedHtml.trim(),
        };

    } catch (error) {
        console.error("Gemini HTML translation failed:", error);
        throw new Error("Could not translate content.");
    }
};

/**
 * optimizeTableForSpeech
 * Client-side optimization for tables in TTS.
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
 * Creates a stateful Chat session using the SDK.
 */
export const createChatSession = (options: PineXOptions): Chat => {
    let systemInstruction = PINEX_SYSTEM_INSTRUCTION_BASE;
    if (options.context) {
        systemInstruction += `\n\nCURRENT DOCUMENT CONTEXT:\n${options.context}`;
    }

    const config: any = {
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: PineXToolDeclarations }]
    };

    if (options.enableSearch) {
        config.tools.push({ googleSearch: {} });
    }
    
    // Explicitly cast history to match SDK expectation if types conflict slightly,
    // though the structures are compatible.
    const chatHistory = options.history?.map(h => ({
        role: h.role,
        parts: h.parts
    }));

    const chatSession = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: config,
        history: chatHistory
    });

    return {
        sendMessage: async (params: { message: string }) => {
            const result = await chatSession.sendMessage({ message: params.message });
            return {
                text: result.text,
                candidates: result.candidates,
                functionCalls: result.functionCalls
            };
        }
    };
};

/**
 * generateSpeech
 * Generates audio bytes using the TTS model.
 */
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

/**
 * analyzeImage
 * Analyzes an image using the gemini-3-pro-preview model.
 */
export const analyzeImage = async (base64Image: string, mimeType: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: base64Image } },
                    { text: "Analyze this document/image. Extract all text, headings, tables. Return Semantic HTML5. Preserve original language." }
                ]
            }
        });
        
        let html = response.text || '';
        html = html.replace(/```html/g, '').replace(/```/g, '');
        return html;
    } catch (error) {
        console.error("Image analysis failed:", error);
        return `<p>Error analyzing image content.</p>`;
    }
};

/**
 * fetchWebPageContent
 * Extracts web content using Google Search Grounding with High Fidelity.
 */
export const fetchWebPageContent = async (url: string, targetLanguage: string = 'English'): Promise<{title: string, html: string, text: string}> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
            Act as a high-fidelity accessible web scraper. Fetch the URL: ${url}.
            
            INSTRUCTIONS:
            1. Extract the FULL content of the article or page.
            2. **DO NOT SUMMARIZE**. Return the complete text.
            3. Convert the content into Semantic HTML5:
               - Preserve all Headings (<h1> through <h6>).
               - Preserve all Tables (<table>, <tr>, <th>, <td>) with their data.
               - Preserve all Images as <img src="..." alt="...">. Ensure you generate descriptive 'alt' text if missing.
               - Preserve all Links as <a href="...">.
               - Preserve Lists (<ul>, <ol>, <li>).
            4. If the page is not in ${targetLanguage}, translate it to ${targetLanguage} while keeping the HTML structure.
            
            OUTPUT FORMAT:
            Return a single raw JSON object with these exact keys:
            {
              "title": "Page Title",
              "contentHtml": "The full content in semantic HTML5",
              "plainText": "The full text content for speech synthesis"
            }
            `,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const text = response.text || '';
        // Robust JSON extraction matching the code block or raw JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            // Fallback: If model refused JSON format, wrap raw text
             return {
                title: "Extracted Content",
                html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
                text: text
            };
        }

        try {
            const data = JSON.parse(jsonMatch[0]);
            return {
                title: data.title || "Web Page",
                html: data.contentHtml || "<p>No content found.</p>",
                text: data.plainText || "No content found."
            };
        } catch (e) {
            // Fallback for bad JSON parsing
            return {
                title: "Extracted Content",
                html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
                text: text
            };
        }

    } catch (error) {
        console.error("Web fetch failed:", error);
        throw new Error("Could not fetch web page content. Please try a different URL.");
    }
};
