
import { GoogleGenAI, Modality, Type, FunctionDeclaration, LiveServerMessage, Chat } from "@google/genai";
import { AppSettings, ChatMessage, PineXOptions, ReadingLevel, Content, LiveConnection, QuizQuestion } from '../types';
import { PINEX_SYSTEM_INSTRUCTION_BASE } from '../constants';
import { base64ToUint8Array } from './audioService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Optimized for Indian Users (Multi-lingual + Mixed Script)
const LIVE_VISION_SYSTEM_INSTRUCTION = `
You are Pine-X, an intelligent vision assistant for blind users in India.
Your Mode: AUTO-READ & DESCRIBE.

1. **INDIAN CONTEXT & LANGUAGE**:
   - **Detect the script** visible in the view (Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, or English).
   - **Speak in the detected language** with a natural, native accent.
   - **Mixed Script**: If you see English + Indic text (e.g., a menu or sign), read it naturally as an Indian speaker would (e.g., English brand names with Indian English accent, local text natively).
   - **Currency**: Always read prices as "Rupees" (e.g., "150 Rupees").
   - **Numbers**: Read phone numbers digit-by-digit or in natural groups (e.g., "98-480...").

2. **READ IMMEDIATELY**: As soon as you see text, read it aloud. Do not wait.

3. **VISUAL DESCRIPTION**: Describe the scene accessibly. Mention colors, shapes, and packaging (e.g., "Red medicine strip", "Green veg mark", "Auto-rickshaw meter").

4. **ENTITIES & ACTIONS**: 
   - If you see a phone number, say exactly: "Phone found: [number]".
   - If you see an address, say exactly: "Address found: [address]".
   - If you see a price, mention it clearly.

5. **GUIDANCE**: 
   - If blurry/dark, politely ask: "Hold steady" or "Turn on light".
   - If text is cut off, ask: "Move camera left/right".

6. **NO REPETITION**: Do not repeat text you just read unless the user asks or the view changes.
`;

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
    voiceName: string = 'Kore', // Default to Kore (Balanced) for Indian English context
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
                tools: useVisionPrompt ? [] : [{ functionDeclarations: PineXToolDeclarations }]
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

export const analyzeFrozenFrame = async (base64Image: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: "Analyze this image in high detail for a blind user in India. 1. Read ALL text (Indic and English). 2. Describe objects/products. 3. Look for expiry dates, prices (Rupees), and safety warnings. 4. Speak naturally in Indian English." }
                ]
            }
        });
        return response.text || "Analysis failed.";
    } catch (e) {
        console.error("Freeze analysis failed", e);
        return "Could not analyze the image.";
    }
};

export const transformTextToSemanticHtml = async (text: string, readingLevel: ReadingLevel = ReadingLevel.NORMAL): Promise<string> => {
    let prompt = "Convert the following text to semantic HTML5. Use appropriate tags like <h1>, <p>, <ul>, <table>.";
    if (readingLevel === ReadingLevel.SIMPLIFIED) prompt += " Simplify the content for a 5th grade reading level.";
    if (readingLevel === ReadingLevel.ACADEMIC) prompt += " Use academic tone.";
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${prompt}\n\nTEXT:\n${text.substring(0, 30000)}`
    });
    return response.text || "";
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text: text.substring(0, 3000) }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            }
        }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const analyzeImage = async (base64Data: string, mimeType: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: "Describe this image in semantic HTML format." }
            ]
        }
    });
    return response.text || "<p>No description available.</p>";
};

export const optimizeTableForSpeech = (html: string): string => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || "";
};

export const fetchWebPageContent = async (url: string, targetLanguage: string, isVisualStory: boolean): Promise<{ title: string, html: string, text: string }> => {
    const prompt = `Fetch content from ${url}. Return a JSON with title, contentHtml, and plainText. Translate to ${targetLanguage} if needed.`;
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });
    
    const text = response.text || "";
    try {
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
        }
    } catch (e) {
        // Fallback
    }
    return { title: "Web Page", html: `<p>${text}</p>`, text: text };
};

export const generateDocumentOutline = async (text: string): Promise<string[]> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate a table of contents for this text. Return JSON array of strings. Text: ${text.substring(0, 30000)}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });
    return JSON.parse(response.text || "[]");
};

export const summarizeSelection = async (text: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Summarize this text selection: ${text}`
    });
    return response.text || "";
};

export const translateSemanticHtml = async (html: string, targetLanguage: string): Promise<{ title: string, html: string }> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Translate this HTML to ${targetLanguage}. Return JSON { "title": string, "html": string }. HTML: ${html.substring(0, 30000)}`,
         config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    html: { type: Type.STRING }
                },
                required: ['title', 'html']
            }
        }
    });
    return JSON.parse(response.text || '{"title":"", "html":""}');
};

export const generateDocumentSummary = async (text: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Summarize this document: ${text.substring(0, 30000)}`
    });
    return response.text || "";
};

export const createChatSession = (options: PineXOptions): Chat => {
    // Explicitly define tools array with 'any' type to prevent TS inference issues
    // when conditionally pushing mutually exclusive tool types.
    const tools: any[] = [];
    
    if (options.enableSearch) {
        tools.push({ googleSearch: {} });
    } else {
        // Only add app control tools if not using Google Search (mutually exclusive)
        tools.push({ functionDeclarations: PineXToolDeclarations });
    }

    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: PINEX_SYSTEM_INSTRUCTION_BASE + (options.context ? `\n\nCONTEXT:\n${options.context}` : ""),
            tools: tools.length > 0 ? tools : undefined,
            thinkingConfig: options.enableThinking ? { thinkingConfig: { thinkingBudget: 1024 } } : undefined,
        },
        history: options.history
    });
};

export const generateDocumentQuiz = async (text: string): Promise<QuizQuestion[]> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a quiz from this text: ${text.substring(0, 20000)}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                    },
                    required: ['question', 'options', 'correctAnswer', 'explanation']
                }
            }
        }
    });
    return JSON.parse(response.text || "[]");
};

export const generatePodcastScript = async (text: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Write a podcast script discussing this text. Use speakers "Alex" and "Maya". Format as "Speaker: Text". Text: ${text.substring(0, 30000)}`
    });
    return response.text || "";
};

export const generateMultiSpeakerSpeech = async (script: string): Promise<Uint8Array | null> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: { parts: [{ text: script }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'Alex', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
                        { speaker: 'Maya', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
                    ]
                }
            }
        }
    });
    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (data) return base64ToUint8Array(data);
    return null;
};

export const getSemanticLookup = async (selection: string, context: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Define "${selection}" in context: ${context.substring(0, 500)}. Max 20 words.`
    });
    return response.text || "";
};
