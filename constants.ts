import { AppSettings, ColorMode } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 1.2, 
  colorMode: ColorMode.LIGHT,
  speechRate: 1.0,
  pitch: 1.0,
  viewMode: 'accessible'
};

export const THEME_CLASSES = {
  [ColorMode.LIGHT]: "bg-gray-100 text-gray-900",
  [ColorMode.DARK]: "bg-gray-950 text-gray-100",
  [ColorMode.HIGH_CONTRAST]: "bg-black text-yellow-300",
};

export const UI_CLASSES = {
  buttonPrimary: "bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-medium transition-colors active:scale-95 shadow-sm",
  buttonSecondary: "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 rounded-lg px-4 py-2 font-medium transition-colors active:scale-95",
  buttonHighContrast: "bg-yellow-300 hover:bg-yellow-400 text-black border-4 border-white rounded-none px-6 py-3 font-bold uppercase tracking-wide",
};