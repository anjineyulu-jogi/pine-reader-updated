
// Document structure types
export enum DocumentType {
  PDF = 'PDF',
  TXT = 'TXT',
  DOCX = 'DOCX',
  XLSX = 'XLSX',
  IMAGE = 'IMAGE',
  WEB = 'WEB',
  WEB_ARTICLE = 'WEB_ARTICLE',
  UNKNOWN = 'UNKNOWN'
}

export interface DocumentMetadata {
  name: string;
  type: DocumentType;
  size?: number; // Optional size for file identification
  pageCount: number;
  lastReadDate: number;
  lastOpened?: number; // Sync with storage metadata
  // NEW: Tracks if the entire document has been processed for semantic HTML
  isFullyProcessed?: boolean; 
  // NEW: An optional array to store the Table of Contents structure
  tableOfContents?: { title: string; page: number }[]; 
  // NEW: Cached AI summary
  summary?: string;
}

// Replaced generic ContentBlock with Page-based model
export interface PageData {
    pageNumber: number;
    text: string;        // Raw text from PDF.js
    semanticHtml?: string; // AI generated HTML
    speechText?: string;   // Optimized text for TTS (with narrative tables)
}

export interface ParsedDocument {
  metadata: DocumentMetadata;
  pages: PageData[];
  rawText: string;
}

// Settings types
export enum ColorMode {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  HIGH_CONTRAST = 'HIGH_CONTRAST'
}

export enum ReadingLevel {
  NORMAL = 'normal',
  SIMPLIFIED = 'simplified',
  ACADEMIC = 'academic',
}

export type AppLanguage = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml';

export interface AppSettings {
  fontSize: number; // in rem
  colorMode: ColorMode;
  speechRate: number; // Kept for future use if needed, though manual speech is removed
  pitch: number;
  viewMode: 'original' | 'accessible';
  voiceName: string; // New: TTS Voice Selection
  longPressDuration: number; // ms
  language: AppLanguage; // New: App Language
  readingLevel: ReadingLevel; // New: Adaptive Text Simplification
  seekDuration: number; // NEW: Audio rewind/forward duration in seconds
}

// Navigation Types
export enum Tab {
  DOCUMENTS = 'DOCUMENTS',
  OCR = 'OCR',
  PINEX = 'PINEX',
  BOOKMARKS = 'BOOKMARKS',
  SETTINGS = 'SETTINGS',
  WEB_READER = 'WEB_READER',
  MORE = 'MORE' // New tab for tools
}

// NEW: Defines the mode of the bottom control bar
export enum ReaderControlMode {
  DOCUMENT_CONTROLS = 'DOCUMENT_CONTROLS', // Default: Prev/Next/More/PineX
  MORE_OPTIONS = 'MORE_OPTIONS',           // Menu of secondary tools
  TTS_PLAYER = 'TTS_PLAYER',               // Audio controls (Play/Pause, Rewind/FF)
}

export interface Bookmark {
  id: string;
  fileId: string;
  fileName: string;
  text: string;
  type: 'HEADING' | 'LINK' | 'TABLE' | 'TEXT';
  pageNumber: number;
  timestamp: number;
  summary?: string; // NEW: AI Summary
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; uri: string }[];
  isQuiz?: boolean; // New: Marks message as part of a quiz flow
}

// --- SDK REPLACEMENTS ---

export interface Content {
    role: string;
    parts: { text: string }[];
}

export interface PineXOptions {
  enableSearch?: boolean;
  enableThinking?: boolean;
  context?: string;
  history?: Content[];
  tools?: any[]; // Allow passing tool definitions
}

// Mimics the GoogleGenAI Chat interface
export interface Chat {
  sendMessage: (params: { message: string }) => Promise<{
    text: string;
    candidates?: any[]; // For grounding metadata
    functionCalls?: any[]; // For tool usage
  }>;
}

export interface ReaderProps {
  page: PageData | undefined;
  pdfProxy: any; // Raw PDF Document Proxy from PDF.js
  settings: AppSettings;
  isProcessing: boolean;
  onPageChange: (delta: number) => void;
  documentName: string;
  onBookmark: (bm: Bookmark) => void;
  viewMode: 'original' | 'reflow'; // Controlled by parent
  onDoubleTap?: () => void;
  jumpToText?: string | null; // For TOC Navigation
  onTextSelection?: (text: string) => void; // New: Text Selection Callback
  
  // NEW PROPS FOR CONTROLS
  readerControlMode: ReaderControlMode;
  setReaderControlMode: (mode: ReaderControlMode) => void;
  onToggleNightMode: () => void;
  onToggleViewMode: () => void;
  onToggleTTS: () => void;
  isSpeaking: boolean;
  onJumpToPage: (pageNumber: number) => void;
  onRewind: (seconds: number) => void;
  onFastForward: (seconds: number) => void;
  onAskPineX: () => void;
  onBack: () => void;
  onShare: () => void;
  
  // NEW: Summarize Feature
  onSummarize: () => void;
}

export interface PineXAction {
  action: 'NAVIGATE' | 'SET_SETTING' | 'TTS_CONTROL' | 'SHARE';
  payload: {
    tab?: string; // Changed to string to match JSON output easier
    pageNumber?: number;
    key?: keyof AppSettings;
    value?: any;
    command?: 'PLAY' | 'PAUSE' | 'FORWARD' | 'BACK' | 'STOP' | 'RESUME';
    text?: string;
  }
}

// NEW: Interface for Live Session Control
export interface LiveConnection {
    disconnect: () => void;
    sendVideoFrame: (base64Data: string) => void;
}

// NEW: Quiz Interface
export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
}
