
import { GoogleGenAI, Modality, Type, FunctionDeclaration, LiveServerMessage } from "@google/genai";
import { AppSettings, Chat, ChatMessage, PineXOptions, ReadingLevel, Content, LiveConnection, QuizQuestion } from '../types';
import { PINEX_SYSTEM_INSTRUCTION_BASE } from '../constants';

// Initialize the SDK directly with the Environment Variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CONSTANTS: EXACT PROMPTS ---

const VISION_OCR_PROMPT = `
You are a precise accessibility OCR tool for Telugu Web Stories.
Input: Sequential screenshots from a slideshow about actor Daggubati Venkatesh's fitness and food secrets.

Output only this format:

Slide 1:
Telugu text: [copy ALL visible text exactly, preserve script]
Image description: [brief, accessible description of main photo]

Slide 2:
...

Rules:
- Extract ONLY visible text — verbatim, no translation, no fixes.
- Never add, summarize, or hallucinate.
- If no text: "No visible text"
- If unclear: "Unclear text"
No other commentary.
`;

const SEMANTIC_CONVERSION_PROMPT_BASE = `
You are an expert accessibility engine. Convert the provided raw text/narrative into perfect, semantic HTML5. 

RULES:
1. Use <article>, <h1> for title, <h2> for slide/section titles.
2. For narrative text, use <p>.
3. For images described in the text, use <figure> and <figcaption> or <img alt="..."> if appropriate.
4. For tables, use <table> with role="grid", scope="col/row".
5. CRITICAL: Preserve ALL Indic language scripts (Telugu, Hindi, etc.) exactly as they appear. Do NOT transliterate or translate unless explicitly asked.
6. Ensure high contrast and readability.
`;

const LIVE_VISION_SYSTEM_INSTRUCTION = `
You are Pine-X, an intelligent vision assistant for blind and low-vision users. You are receiving a live video stream and audio.
Your goal is to be the user's eyes.

1. **READ EVERYTHING**: Immediately read any visible text, signs, menus, or labels aloud. For tables or menus, read row-by-row to maintain structure.
2. **DESCRIBE SCENES**: If no text is prominent, describe the environment, obstacles, and objects clearly.
3. **BE RESPONSIVE**: Listen to user questions and answer instantly based on what you see.
4. **BE SPECIFIC**: Mention colors, approximate distances, and layout details if relevant.
5. **ACCESSIBILITY**: Speak clearly, at a moderate pace. Prioritize safety and navigational cues.
6. **FORMAT**: Keep responses concise and spoken-style.
`;

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

interface LiveSessionCallbacks {
    onConnect: () => void;
    onDisconnect: () => void;
    onError: (e: Error) => void;
    onAudioLevel: (level: number) => void; 
    onTranscript?: (text: string, isUser: boolean) => void; 
}

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

export const startLiveSession = async (
    callbacks: LiveSessionCallbacks,
    voiceName: string = 'Zephyr',
    context: string = '',
    useVisionPrompt: boolean = false
): Promise<LiveConnection> => {
    let audioContext: AudioContext | null = null;
    let inputSource: MediaStreamAudioSourceNode | null = null;
    let processor: ScriptProcessorNode | null = null;
    let stream: MediaStream | null = null;
    let nextStartTime = 0;
    let isConnected = false;
    let liveSession: any = null;
    
    const cleanup = () => {
        isConnected = false;
        if (processor) { processor.disconnect(); processor = null; }
        if (inputSource) { inputSource.disconnect(); inputSource = null; }
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        if (audioContext) { audioContext.close(); audioContext = null; }
        callbacks.onDisconnect();
    };

    try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        stream = await navigator.mediaDevices.getUserMedia({ audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000 
        }});
        
        const systemInstruction = useVisionPrompt 
            ? LIVE_VISION_SYSTEM_INSTRUCTION 
            : PINEX_SYSTEM_INSTRUCTION_BASE + (context ? `\n\nCONTEXT:\n${context}` : "");

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
                },
                systemInstruction: systemInstruction,
                outputAudioTranscription: {}, 
                inputAudioTranscription: {}, 
            },
            callbacks: {
                onopen: async () => {
                    isConnected = true;
                    callbacks.onConnect();
                    if (!audioContext || !stream) return;
                    const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                    inputSource = inputContext.createMediaStreamSource(stream);
                    processor = inputContext.createScriptProcessor(4096, 1, 1);
                    processor.onaudioprocess = (e) => {
                        if (!isConnected) return;
                        const inputData = e.inputBuffer.getChannelData(0);
                        let sum = 0;
                        for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                        const rms = Math.sqrt(sum / inputData.length);
                        callbacks.onAudioLevel(rms); 
                        const pcm16 = floatTo16BitPCM(inputData);
                        const base64Audio = arrayBufferToBase64(pcm16);
                        sessionPromise.then(session => {
                            session.sendRealtimeInput({
                                media: { mimeType: 'audio/pcm;rate=16000', data: base64Audio }
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
                        const start = Math.max(now, nextStartTime);
                        source.start(start);
                        nextStartTime = start + buffer.duration;
                    }
                    if (msg.serverContent?.interrupted) { nextStartTime = 0; }
                    
                    if (callbacks.onTranscript) {
                        if (msg.serverContent?.outputTranscription?.text) {
                            callbacks.onTranscript(msg.serverContent.outputTranscription.text, false);
                        } else if (msg.serverContent?.inputTranscription?.text) {
                            callbacks.onTranscript(msg.serverContent.inputTranscription.text, true);
                        }
                    }
                },
                onclose: () => { cleanup(); },
                onerror: (e) => {
                    console.error("Gemini Live Error", e);
                    callbacks.onError(new Error("Connection error"));
                    cleanup();
                }
            }
        });
        
        liveSession = await sessionPromise;

        return {
            disconnect: cleanup,
            sendVideoFrame: (base64Data: string) => {
                if (isConnected && liveSession) {
                    liveSession.sendRealtimeInput({
                        media: { mimeType: 'image/jpeg', data: base64Data }
                    });
                }
            }
        };

    } catch (error) {
        console.error("Failed to start Live Session", error);
        callbacks.onError(error as Error);
        cleanup();
        return { disconnect: () => {}, sendVideoFrame: () => {} };
    }
};

export const transformTextToSemanticHtml = async (text: string, readingLevel: ReadingLevel = ReadingLevel.NORMAL): Promise<string> => {
  try {
    let systemInstruction = SEMANTIC_CONVERSION_PROMPT_BASE;

    if (readingLevel === ReadingLevel.SIMPLIFIED) {
        systemInstruction = "The user has requested the content be rewritten using a 5th-grade reading level. Simplify complex vocabulary, shorten sentences, and maintain only the core concepts, but strictly adhere to the semantic HTML output rules. " + systemInstruction;
    } else if (readingLevel === ReadingLevel.ACADEMIC) {
        systemInstruction = "The user has requested a scholarly, formal reading level. Ensure all language is precise, dense with information, and uses advanced vocabulary. Strictly adhere to the semantic HTML output rules. " + systemInstruction;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.1,
        },
        contents: `RAW TEXT TO CONVERT:\n${text.substring(0, 30000)}`
    });

    let html = response.text || '';
    html = html.replace(/```html/g, '').replace(/```/g, '');
    return html;
  } catch (error) {
    console.error("HTML conversion failed:", error);
    return text.split('\n').map(line => `<p>${line}</p>`).join('');
  }
};

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
        return [];
    }
};

export const summarizeSelection = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Summarize the following text concisely using bullet points. Focus on the main ideas and key takeaways.\n\nTEXT:\n${text.substring(0, 15000)}`,
        });
        return response.text || "Could not generate summary.";
    } catch (error) {
        throw new Error("Failed to summarize text.");
    }
};

// --- NEW: ONE-TAP DOCUMENT SUMMARIZER ---
export const generateDocumentSummary = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Provide a concise summary of the following document in 4-6 bullet points. 
            Focus on main ideas, key facts, and conclusions. 
            Use clear, accessible language. 
            Preserve original language if non-English (e.g., Telugu, Hindi).
            
            DOCUMENT TEXT:
            ${text.substring(0, 40000)}`, // Limit context to avoid overload
        });
        return response.text || "Could not generate summary.";
    } catch (error) {
        throw new Error("Failed to generate document summary.");
    }
};

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
        return "Could not retrieve definition.";
    }
};

export const translateSemanticHtml = async (htmlContent: string, targetLanguage: string): Promise<{title: string, html: string}> => {
    try {
        const prompt = `Translate the following HTML content, including all text within tags (h1, p, li, td, etc.), into ${targetLanguage}. Preserve all HTML structure, tags, and accessibility attributes exactly as they are. Only translate the visible text. Return ONLY the translated HTML content (do not wrap it in a code block or add any conversational text).`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            config: { systemInstruction: prompt, temperature: 0.1 },
            contents: htmlContent
        });
        let translatedHtml = response.text || '';
        translatedHtml = translatedHtml.replace(/```html/g, '').replace(/```/g, '');
        const titleResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            config: { systemInstruction: `Extract and translate the main title from the following HTML into ${targetLanguage}. Return only the translated title text.`, temperature: 0.1 },
            contents: htmlContent.substring(0, 2000)
        });
        return {
            title: titleResponse.text?.trim() || 'Translated Article',
            html: translatedHtml.trim(),
        };
    } catch (error) {
        throw new Error("Could not translate content.");
    }
};

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
    const chatHistory = options.history?.map(h => ({ role: h.role, parts: h.parts }));
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

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string | undefined> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text.substring(0, 2000) }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) { throw error; }
};

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
    } catch (error) { return `<p>Error analyzing image content.</p>`; }
};

// --- NEW FEATURE: GENERATE QUIZ ---
export const generateDocumentQuiz = async (documentText: string): Promise<QuizQuestion[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate 8-12 multiple choice questions based on the following text.
            Text: ${documentText.substring(0, 40000)}
            
            Return ONLY a JSON array with this structure:
            [
              {
                "question": "Question text here?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": "Option A",
                "explanation": "Why this is correct."
              }
            ]`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctAnswer: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                        }
                    }
                }
            }
        });
        const jsonStr = response.text || "[]";
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Quiz gen error", error);
        return [];
    }
};

/**
 * CAPTURE WEB STORY SCREENSHOTS
 * Renders HTML into a hidden container and uses html2canvas to capture slides.
 * Simulates a vertical scroll to capture multiple parts of a Web Story.
 */
const captureWebStoryScreenshots = async (htmlContent: string, maxSlides: number = 15): Promise<string[]> => {
    try {
        const { default: html2canvas } = await import('html2canvas');
        
        // 1. Create a hidden container with typical mobile dimensions
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '375px'; // Standard mobile width
        container.style.backgroundColor = '#ffffff';
        container.style.zIndex = '-1';
        container.innerHTML = htmlContent;
        
        // Ensure images inside have absolute paths if possible (heuristic)
        // Note: Real proxies would handle this better.
        const images = container.querySelectorAll('img');
        images.forEach(img => {
            img.crossOrigin = "Anonymous"; // Attempt CORS
        });

        document.body.appendChild(container);

        // Wait for resources to load essentially
        await new Promise(r => setTimeout(r, 1500));

        const screenshots: string[] = [];
        const viewportHeight = 667;
        const totalHeight = container.scrollHeight;
        
        // 2. Loop to capture "slides"
        // We capture every 'viewportHeight' pixels
        for (let scrollY = 0; scrollY < totalHeight && screenshots.length < maxSlides; scrollY += viewportHeight) {
            
            // "Scroll" the container
            container.style.transform = `translateY(-${scrollY}px)`;
            
            // Small delay for render update
            await new Promise(r => setTimeout(r, 200));

            try {
                const canvas = await html2canvas(container, {
                    useCORS: true,
                    logging: false,
                    width: 375,
                    height: viewportHeight,
                    y: scrollY, 
                    scale: 1, 
                    backgroundColor: '#ffffff'
                });

                // Get base64 without prefix
                const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                
                // Basic check to avoid capturing completely empty white slides
                if (base64.length > 3000) {
                    screenshots.push(base64);
                }
            } catch (err) {
                console.warn("Frame capture failed", err);
            }
        }

        document.body.removeChild(container);
        return screenshots;

    } catch (e) {
        console.warn("Screenshot process failed:", e);
        return [];
    }
};

/**
 * fetchWebPageContent
 * UPGRADED: Includes logic for Web Story detection and Vision extraction.
 */
export const fetchWebPageContent = async (
    url: string, 
    preferredLanguage: string = 'English',
    isVisualStoryForce: boolean = false
): Promise<{title: string, html: string, text: string}> => {
    try {
        let rawContent = "";
        let title = "Web Article";
        
        // --- STEP 1: FETCH HTML SOURCE ---
        // We use Gemini Search Grounding to get the source code or text.
        // This acts as our "Proxy".
        let fetchedHtml = "";
        
        const isStoryUrl = url.includes('/webstories/') || url.includes('/mwebstories/') || url.includes('amp_stories');
        const useVisionMode = isVisualStoryForce || isStoryUrl;

        // Fetch command
        const searchResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Fetch the raw HTML source code for: ${url}. 
            Return ONLY the HTML code block. Do not converse.`,
            config: { tools: [{ googleSearch: {} }] }
        });
        fetchedHtml = searchResponse.text?.replace(/```html/g, '').replace(/```/g, '') || "";

        // --- STEP 2: VISION MODE (For Stories) ---
        if (useVisionMode && fetchedHtml.length > 50) {
            // A. Capture Slides
            const screenshots = await captureWebStoryScreenshots(fetchedHtml);
            
            if (screenshots.length > 0) {
                // B. Analyze with Gemini Vision
                const visionParts = screenshots.map(b64 => ({
                    inlineData: { mimeType: 'image/jpeg', data: b64 }
                }));
                
                // Attach the strict prompt
                visionParts.push({ text: VISION_OCR_PROMPT } as any);

                const visionResponse = await ai.models.generateContent({
                    model: 'gemini-3-pro-preview', // Best model for OCR/Vision
                    contents: { parts: visionParts }
                });

                rawContent = visionResponse.text || "No text extracted from slides.";
                title = "Visual Web Story";
            } else {
                // Fallback if capturing failed
                rawContent = "Could not visually render story. Using text fallback.\n" + fetchedHtml.substring(0, 2000);
            }
        } else {
            // --- STEP 3: STANDARD MODE ---
            const extractionPrompt = `
                Act as an expert accessible web scraper. Target URL: ${url}
                YOUR GOAL: Extract the Full Title and the Full Article Text/Narrative.
                MODE: STANDARD ARTICLE
                - Extract the main article content (headline, body, subheadings).
                - Remove navigation, footers, ads, and sidebars.
                OUTPUT FORMAT: JSON with "title" and "rawContent".
            `;
            
            const textResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: extractionPrompt,
                config: { tools: [{ googleSearch: {} }] }
            });
            
            const jsonMatch = textResponse.text?.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const data = JSON.parse(jsonMatch[0]);
                    rawContent = data.rawContent || data.plainText || "";
                    title = data.title || "Web Article";
                } catch(e) {}
            }
            if (!rawContent) rawContent = textResponse.text || "";
        }

        // --- STEP 4: SEMANTIC HTML CONVERSION ---
        const semanticResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `CONVERT THIS NARRATIVE TO HTML:\n\n${rawContent}`,
            config: {
                systemInstruction: SEMANTIC_CONVERSION_PROMPT_BASE + 
                (preferredLanguage !== 'English' ? `\nTarget Language: ${preferredLanguage} (if translation requested, otherwise keep original).` : ""),
                temperature: 0.1
            }
        });

        let finalHtml = semanticResponse.text || '';
        finalHtml = finalHtml.replace(/```html/g, '').replace(/```/g, '');

        return {
            title: title,
            html: finalHtml || "<p>No content extracted.</p>",
            text: rawContent || "No content."
        };

    } catch (error) {
        console.error("Web fetch failed:", error);
        throw new Error("Could not fetch web page. Try Visual Mode or a different URL.");
    }
};
