
import { AppSettings, ColorMode, AppLanguage, ReadingLevel } from "./types";

// Proxy Configuration
// This points to the proxy server route. In development, Vite proxies /api to localhost:3000.
export const PROXY_BASE_URL = '/api/gemini';

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 1.2, 
  colorMode: ColorMode.LIGHT,
  speechRate: 1.0,
  pitch: 1.0,
  viewMode: 'accessible',
  voiceName: 'Kore', // Default voice
  longPressDuration: 3000, // 3 seconds default
  language: 'en',
  readingLevel: ReadingLevel.NORMAL
};

export const AVAILABLE_VOICES = [
  { id: 'Kore', name: 'Kore (Balanced)' },
  { id: 'Puck', name: 'Puck (Energetic)' },
  { id: 'Charon', name: 'Charon (Deep)' },
  { id: 'Fenrir', name: 'Fenrir (Fast)' },
  { id: 'Zephyr', name: 'Zephyr (Soft)' },
];

export const SUPPORTED_LANGUAGES: { code: AppLanguage, name: string, font: string }[] = [
  { code: 'en', name: 'English', font: 'Roboto' },
  { code: 'hi', name: 'Hindi (हिंदी)', font: 'Noto Sans Devanagari' },
  { code: 'te', name: 'Telugu (తెలుగు)', font: 'Noto Sans Telugu' },
  { code: 'ta', name: 'Tamil (தமிழ்)', font: 'Noto Sans Tamil' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)', font: 'Noto Sans Kannada' },
  { code: 'ml', name: 'Malayalam (മലയാളം)', font: 'Noto Sans Malayalam' },
];

export const UI_TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    back: "Back",
    share: "Share",
    prevPage: "Prev Page",
    nextPage: "Next Page",
    read: "Read Aloud",
    stop: "Stop Reading",
    savePdf: "Save PDF",
    viewReflow: "Text View",
    viewOriginal: "Original",
    bookmarks: "Bookmarks",
    askPinex: "Ask PineX",
    rewind: "Rewind 10s",
    forward: "Forward 10s",
    more: "More Options",
    close: "Close",
    nightMode: "Night Mode",
    lightMode: "Light Mode",
    documents: "Documents",
    settings: "Settings",
    webReader: "Web Reader"
  },
  hi: {
    back: "पीछे",
    share: "शेयर करें",
    prevPage: "पिछला पेज",
    nextPage: "अगला पेज",
    read: "पढ़ें",
    stop: "रोकें",
    savePdf: "PDF सेव करें",
    viewReflow: "टेक्स्ट व्यू",
    viewOriginal: "मूल डॉक्यूमेंट",
    bookmarks: "बुकमार्क",
    askPinex: "PineX से पूछें",
    rewind: "10s पीछे",
    forward: "10s आगे",
    more: "अधिक विकल्प",
    close: "बंद करें",
    nightMode: "नाईट मोड",
    lightMode: "लाईट मोड",
    documents: "डॉक्यूमेंट्स",
    settings: "सेटिंग्स",
    webReader: "वेब रीडर"
  },
  te: {
    back: "వెనుకకు",
    share: "భాగస్వామ్యం",
    prevPage: "ముందు పేజీ",
    nextPage: "తరువాతి పేజీ",
    read: "చదవండి",
    stop: "ఆపు",
    savePdf: "PDF సేవ్",
    viewReflow: "టెక్స్ట్ వీక్షణ",
    viewOriginal: "అసలు పత్రం",
    bookmarks: "బుక్‌మార్క్‌లు",
    askPinex: "PineX అడగండి",
    rewind: "10s వెనుకకు",
    forward: "10s ముందుకు",
    more: "మరిన్ని ఎంపికలు",
    close: "మూసివేయి",
    nightMode: "నైట్ మోడ్",
    lightMode: "లైట్ మోడ్",
    documents: "పత్రాలు",
    settings: "అమరికలు",
    webReader: "వెబ్ రీడర్"
  },
  ta: {
    back: "பின்னால்",
    share: "பகிர்",
    prevPage: "முந்தைய பக்கம்",
    nextPage: "அடுத்த பக்கம்",
    read: "வாசி",
    stop: "நிறுத்து",
    savePdf: "PDF சேமி",
    viewReflow: "உரை காட்சி",
    viewOriginal: "அசல் ஆவணம்",
    bookmarks: "புக்மார்க்குகள்",
    askPinex: "PineX கேள்",
    rewind: "10s பின்",
    forward: "10s முன்",
    more: "மேலும்",
    close: "மூடு",
    nightMode: "இரவு முறை",
    lightMode: "பகல் முறை",
    documents: "ஆவணங்கள்",
    settings: "அமைப்புகள்",
    webReader: "வலை ரீடர்"
  },
  kn: {
    back: "ಹಿಂದೆ",
    share: "ಹಂಚಿಕೊಳ್ಳಿ",
    prevPage: "ಹಿಂದಿನ ಪುಟ",
    nextPage: "ಮುಂದಿನ ಪುಟ",
    read: "ಓದಿ",
    stop: "ನಿಲ್ಲಿಸಿ",
    savePdf: "PDF ಉಳಿಸಿ",
    viewReflow: "ಪಠ್ಯ ವೀಕ್ಷಣೆ",
    viewOriginal: "ಮೂಲ ದಾಖಲೆ",
    bookmarks: "ಬುಕ್‌ಮಾರ್ಕ್‌ಗಳು",
    askPinex: "PineX ಕೇಳಿ",
    rewind: "10s ಹಿಂದೆ",
    forward: "10s ಮುಂದೆ",
    more: "ಹೆಚ್ಚಿನ ಆಯ್ಕೆಗಳು",
    close: "ಮುಚ್ಚಿ",
    nightMode: "ರಾತ್ರಿ ಮೋಡ್",
    lightMode: "ಹಗಲು ಮೋಡ್",
    documents: "ದಾಖಲೆಗಳು",
    settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    webReader: "ವೆಬ್ ರೀడರ್"
  },
  ml: {
    back: "പിന്നിലേക്ക്",
    share: "പങ്കിടുക",
    prevPage: "മുമ്പത്തെ പേജ്",
    nextPage: "അടുത്ത പേജ്",
    read: "വായിക്കുക",
    stop: "നിർത്തുക",
    savePdf: "PDF സംരക്ഷിക്കുക",
    viewReflow: "ടെക്സ്റ്റ് കാഴ്ച",
    viewOriginal: "യഥാർത്ഥ രേഖ",
    bookmarks: "ബുക്ക്മാർക്കുകൾ",
    askPinex: "PineX ചോദിക്കുക",
    rewind: "10s പിന്നോട്ട്",
    forward: "10s മുന്നോട്ട്",
    more: "കൂടുതൽ",
    close: "അടയ്ക്കുക",
    nightMode: "രാത്രി മോഡ്",
    lightMode: "പകൽ മോഡ്",
    documents: "രേഖകൾ",
    settings: "ക്രമീകരണങ്ങൾ",
    webReader: "വെബ് റീഡർ"
  }
};

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
   - **Languages**: English, Hindi, Telugu, Tamil, Kannada, Malayalam.
   - **Reading Level**: Normal, Simplified (5th grade), Academic (Scholarly).

YOUR ROLE:
- Answer questions about the current document using the provided context.
- Explain how to use ANY feature of the app using the knowledge base above.
- Control the app if asked (e.g., "Switch to dark mode", "Go to bookmarks").
- Be concise, helpful, friendly, and accessible.
`;
