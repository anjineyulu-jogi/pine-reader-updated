
import { Chat } from "@google/genai";

// Document structure types
export enum DocumentType {
  PDF = 'PDF',
  TXT = 'TXT',
  DOCX = 'DOCX',
  XLSX = 'XLSX',
  IMAGE = 'IMAGE',
  WEB = 'WEB',
  UNKNOWN = 'UNKNOWN'
}

export interface DocumentMetadata {
  name: string;
  type: DocumentType;
  pageCount: number;
  lastReadDate: number;
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

export interface AppSettings {
  fontSize: number; // in rem
  colorMode: ColorMode;
  speechRate: number; // Kept for future use if needed, though manual speech is removed
  pitch: number;
  viewMode: 'original' | 'accessible';
  voiceName: string; // New: TTS Voice Selection
  longPressDuration: number; // ms
}

// Navigation Types
export enum Tab {
  DOCUMENTS = 'DOCUMENTS',
  PINEX = 'PINEX',
  BOOKMARKS = 'BOOKMARKS',
  SETTINGS = 'SETTINGS',
  WEB_READER = 'WEB_READER'
}

export interface Bookmark {
  id: string;
  fileId: string;
  fileName: string;
  text: string;
  type: 'HEADING' | 'LINK' | 'TABLE' | 'TEXT';
  pageNumber: number;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; uri: string }[];
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
}

export type { Chat };
