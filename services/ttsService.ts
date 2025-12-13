
import { generateSpeech } from './geminiService';

/**
 * Speaks a short, non-interrupting system message for auditory feedback.
 * Uses Gemini API for high-quality voice consistency.
 */
export const speakSystemMessage = async (message: string): Promise<void> => {
    try {
        // Generate speech using Gemini
        const audioBase64 = await generateSpeech(message, 'Zephyr'); // Use a consistent helper voice
        
        if (audioBase64) {
            const binaryString = atob(audioBase64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            
            // Decode raw PCM (24kHz from Gemini TTS)
            const pcmData = new Int16Array(bytes.buffer);
            const float32Data = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
                float32Data[i] = pcmData[i] / 32768.0;
            }
            
            const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
            buffer.copyToChannel(float32Data, 0);
            
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start();
        }
    } catch (error) {
        console.warn("Gemini TTS failed for system message", error);
        // Fallback or silent fail - do not use native TTS as requested to retire it
    }
};

/**
 * Wrapper for native screen reader announcements (TalkBack/VoiceOver).
 * Also dispatches an event for web-based ARIA live regions.
 */
export const announceAccessibilityChange = async (message: string): Promise<void> => {
    // 1. Dispatch event for Web ARIA-Live (App.tsx listens to this)
    const event = new CustomEvent('accessibility-announcement', { detail: message });
    window.dispatchEvent(event);

    // 2. Native Screen Reader API
    // Dynamic import to avoid build issues if plugin not present in all envs
    try {
        if ((window as any).Capacitor?.isNativePlatform()) {
             const { Accessibility } = await import('@capacitor/accessibility'); 
             await Accessibility.speak({ value: message });
        }
    } catch (error) {
        // Ignore native errors
    }
};
