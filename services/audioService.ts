
/**
 * Plays a distinct, short sound to indicate a task (like PineX response or article load) is complete.
 * Uses a simple AudioContext tone for maximal reliability across environments.
 */
export const playCompletionSound = () => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioCtx = new AudioContextClass();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // 1. Set the Tone Properties (a quick, friendly 'ding' - A4)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05); // Fade in
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3); // Fade out
        
        // 2. Connect and Play
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();

        // 3. Stop after 0.3 seconds
        oscillator.stop(audioCtx.currentTime + 0.3);

    } catch (e) {
        console.error("Failed to play completion sound:", e);
    }
};

export const playStartSound = () => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioCtx = new AudioContextClass();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // Ascending tone (C5 to E5) to indicate "Listening"
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        oscillator.frequency.linearRampToValueAtTime(659.25, audioCtx.currentTime + 0.2); // E5
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
        console.error("Failed to play start sound:", e);
    }
};

/**
 * Decodes a Base64 string into a Uint8Array.
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

/**
 * Concatenates multiple Uint8Arrays into a single Uint8Array.
 * Used for stitching TTS chunks together.
 */
export const concatenateAudioArrays = (arrays: Uint8Array[]): Uint8Array => {
    let totalLength = 0;
    arrays.forEach(a => totalLength += a.length);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    arrays.forEach(a => {
        result.set(a, offset);
        offset += a.length;
    });
    return result;
}

/**
 * Wraps raw PCM data in a standard WAV header.
 * Gemini TTS returns raw PCM (usually 24kHz, 16-bit mono).
 * Browsers require a container format (like WAV) to play via <audio> or Blob URL.
 */
export const createWavBlob = (pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true); // File size - 8
    writeString(view, 8, 'WAVE');
    
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    const pcmBytes = new Uint8Array(buffer, 44);
    pcmBytes.set(pcmData);

    return new Blob([buffer], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};
