
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
