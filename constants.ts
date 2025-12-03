
import { AppSettings, ColorMode } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 1.2, 
  colorMode: ColorMode.LIGHT,
  speechRate: 1.0,
  pitch: 1.0,
  viewMode: 'accessible',
  voiceName: 'Kore' // Default voice
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
