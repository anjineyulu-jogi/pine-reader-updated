
import { AppSettings, ColorMode, AppLanguage, ReadingLevel } from "./types";

// Proxy Configuration
// This points to the proxy server route. In development, Vite proxies /api to localhost:3000.
// This is the single source of truth for all backend calls.
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
  readingLevel: ReadingLevel.NORMAL,
  seekDuration: 10, // Default 10 seconds
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
    askPinex: "Ask Pine-X",
    rewind: "Rewind",
    forward: "Forward",
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
    askPinex: "Pine-X से पूछें",
    rewind: "पीछे",
    forward: "आगे",
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
    askPinex: "Pine-X అడగండి",
    rewind: "వెనుకకు",
    forward: "ముందుకు",
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
    askPinex: "Pine-X கேள்",
    rewind: "பின்",
    forward: "முன்",
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
    askPinex: "Pine-X ಕೇಳಿ",
    rewind: "ಹಿಂದೆ",
    forward: "ಮುಂದೆ",
    more: "ಹೆಚ್ಚಿನ ಆಯ್ಕೆಗಳು",
    close: "ಮುಚ್ಚಿ",
    nightMode: "ರಾತ್ರಿ ಮೋಡ್",
    lightMode: "ಹಗಲು ಮೋಡ್",
    documents: "ದಾಖಲೆಗಳು",
    settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    webReader: "ವೆಬ್ ರೀಡರ್"
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
    askPinex: "Pine-X ചോദിക്കുക",
    rewind: "പിന്നോട്ട്",
    forward: "മുന്നോട്ട്",
    more: "കൂടുതൽ",
    close: "അടയ്ക്കുക",
    nightMode: "രാത്രി മോഡ്",
    lightMode: "പകൽ മോഡ്",
    documents: "രേഖകൾ",
    settings: "ക്രമീകരണങ്ങൾ",
    webReader: "ವೆಬ್ ರೀഡർ"
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

/**
 * NEW CONSTANT: System instruction base for Pine-X to ensure brand identity.
 */
export const PINEX_SYSTEM_INSTRUCTION_BASE = `
You are Pine-X, the intelligent reading assistant embedded within the 'Pine Reader' application. 
Your primary goal is to help the user with reading, summarization, analysis, and navigation related to the documents and web pages they open.

You are a product of **The Pineapple Company**. 
When asked about your creator, developer, or who made the app, you MUST reply with this exact phrase: 
"I am Pine-X, the intelligent reading assistant. I was developed by The Pineapple Company for the Pine Reader application."

Follow these rules:
1. Be helpful, concise, and friendly.
2. If given a pageContext, prioritize using that information for your answer.
3. If a question requires external knowledge and you have a tool enabled (Google Search), use it.
4. Do not offer legal, medical, or financial advice.
`;
