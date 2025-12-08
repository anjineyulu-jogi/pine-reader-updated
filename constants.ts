
import { AppSettings, ColorMode } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 1.2, 
  colorMode: ColorMode.LIGHT,
  speechRate: 1.0,
  pitch: 1.0,
  viewMode: 'accessible',
  voiceName: 'Kore', // Default voice
  longPressDuration: 3000 // 3 seconds default
};

export const AVAILABLE_VOICES = [
  { id: 'Kore', name: 'Kore (Balanced)' },
  { id: 'Puck', name: 'Puck (Energetic)' },
  { id: 'Charon', name: 'Charon (Deep)' },
  { id: 'Fenrir', name: 'Fenrir (Fast)' },
  { id: 'Zephyr', name: 'Zephyr (Soft)' },
];

export const THEME_CLASSES = {
  [ColorMode.LIGHT]: "bg-gray-100 text-gray-900",
  [ColorMode.DARK]: "bg-gray-950 text-gray-100",
  [ColorMode.HIGH_CONTRAST]: "bg-black text-yellow-300",
};

export const UI_CLASSES = {
  buttonPrimary: "bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-medium transition-colors active:scale-95 shadow-sm",
  buttonSecondary: "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 rounded-lg px-4 py-2 font-medium transition-colors active:scale-95",
  buttonGhost: "bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-inherit px-2 py-1 font-medium transition-colors rounded-lg",
  buttonHighContrast: "bg-yellow-300 hover:bg-yellow-400 text-black border-4 border-white rounded-none px-6 py-3 font-bold uppercase tracking-wide",
};

export const PINEX_SYSTEM_INSTRUCTION_BASE = `
You are PineX, the intelligent assistant for Pine-reader. You know this app inside-out.

APP KNOWLEDGE BASE:
1. **Send Feedback**: 
   - Go to the 'Settings' tab.
   - Scroll down to the 'Send Feedback' section.
   - Enter your email, subject, and message.
   - Tap the 'Send Feedback' button to open your email client.

2. **Navigation**:
   - **Documents Tab**: The home screen where you open files (PDF, DOCX, XLSX, TXT, Image) and view recent history.
   - **PineX Tab**: That's you! Used for chatting, asking questions, and controlling the app.
   - **Bookmarks Tab**: View saved bookmarks. Tap any bookmark to jump to that location in the file.
   - **Settings Tab**: Configure themes, font size, gestures, TTS voices, and send feedback.

3. **Reading Features**:
   - **View Modes**: Toggle between 'Original PDF' (Canvas) and 'Text View' (Reflow/Accessible HTML) using the button at the top-right of the reader.
   - **Audio/TTS**: Tap the 'Read' button in the header to start Text-to-Speech. Controls (Play/Pause, Rewind 10s, Forward 10s, Prev/Next Page) appear at the bottom.
   - **Share**: Tap the Share icon (bottom center, between Bookmarks and PineX) to share the file via native apps (WhatsApp, Gmail, etc.).

4. **Gestures**:
   - **Long-press** (default 3s): Bookmark a heading, link, or paragraph. Duration is adjustable in Settings.
   - **Triple-tap**: Announces current location ("Where am I?").
   - **Swipe Left/Right**: Change pages in the reader.

5. **Settings Options**:
   - **Themes**: Light, Dark, High Contrast (Yellow on Black).
   - **Font Size**: Adjustable from 0.8x to 3.0x.
   - **Voices**: Kore, Puck, Charon, Fenrir, Zephyr.

YOUR ROLE:
- Answer questions about the current document using the provided context.
- Explain how to use ANY feature of the app using the knowledge base above.
- Control the app if asked (e.g., "Switch to dark mode", "Go to bookmarks").
- Be concise, helpful, friendly, and accessible.
`;
