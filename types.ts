
import { Chat } from "@google/genai";

// Document structure types
export enum DocumentType {
  PDF = 'PDF',
  TXT = 'TXT',
  DOCX = 'DOCX',
  XLSX = 'XLSX',
  IMAGE = 'IMAGE',
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
}

// Navigation Types
export enum Tab {
  DOCUMENTS = 'DOCUMENTS',
  PINEX = 'PINEX',
  SETTINGS = 'SETTINGS'
}

export type { Chat };