
import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, Volume2, Share, Bookmark as BookmarkIcon, FileText, ImageIcon, Play, Pause, SkipBack, SkipForward, Download, Moon, Sun, X, Bot, MoreHorizontal, List, Type, Loader2, Sparkles, StopCircle, Globe, Languages, Camera } from 'lucide-react';
import clsx from 'clsx';
import { parsePDF, parseTextFile, parseDocx, parseExcel, getPDFProxy, resumePDFProcessing } from './services/pdfService';
import { transformTextToSemanticHtml, generateSpeech, analyzeImage, optimizeTableForSpeech, fetchWebPageContent, generateDocumentOutline, summarizeSelection, translateSemanticHtml, generateDocumentSummary } from './services/geminiService';
import { saveRecentFileToStorage, getRecentFilesList, getStoredFile, saveReadingProgress, getReadingProgress, StoredFileMetadata, saveBookmark, getAudioData, saveAudioData, getPineXMessages, savePineXMessages, getParsedDocument, saveParsedDocument } from './services/storageService';
import { speakSystemMessage, announceAccessibilityChange } from './services/ttsService';
import { ParsedDocument, AppSettings, ColorMode, Tab, DocumentType, ChatMessage, PineXAction, PageData, ReaderControlMode } from './types';
import { DEFAULT_SETTINGS, THEME_CLASSES, UI_TRANSLATIONS, SUPPORTED_LANGUAGES } from './constants';
import { Reader } from './components/Reader';
import { Button } from './components/ui/Button';
import { BottomNav } from './components/BottomNav';
import { DocumentsView } from './components/DocumentsView';
import { OutlineView } from './components/OutlineView';
import { SummaryModal } from './components/SummaryModal';
import { triggerHaptic } from './services/hapticService';
import { OnboardingTour } from './components/OnboardingTour';
import { Capacitor } from '@capacitor/core'; 
import { App as CapacitorApp } from '@capacitor/app';
import { Share as CapacitorShare } from '@capacitor/share';

// --- LAZY LOADED COMPONENTS ---
const PineX = React.lazy(() => import('./components/ChatBot').then(module => ({ default: module.PineX })));
const BookmarksView = React.lazy(() => import('./components/BookmarksView').then(module => ({ default: module.BookmarksView })));
const SettingsPanel = React.lazy(() => import('./components/SettingsPanel').then(module => ({ default: module.SettingsPanel })));
const WebReaderView = React.lazy(() => import('./components/WebReaderView').then(module => ({ default: module.WebReaderView })));
const OCRView = React.lazy(() => import('./components/OCRView').then(module => ({ default: module.OCRView })));

// Fallback Loader for Suspense
const TabLoader = () => (
  <div className="flex flex-col items-center justify-center h-full w-full bg-inherit">
    <Loader2 className="w-8 h-8 text-[#FFC107] animate-spin" />
  </div>
);

export default function App() {
  const [currentDoc, setCurrentDoc] = useState<ParsedDocument | null>(null);
  const [pdfProxy, setPdfProxy] = useState<any>(null); 
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  // NEW STATE: To show a banner/indicator during background processing
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false);
  // NEW STATE: Manages the bottom control bar state
  const [readerControlMode, setReaderControlMode] = useState<ReaderControlMode>(ReaderControlMode.DOCUMENT_CONTROLS);
  
  const [viewMode, setViewMode] = useState<'original' | 'reflow'>('reflow');
  const [recentFiles, setRecentFiles] = useState<StoredFileMetadata[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DOCUMENTS);

  // Outline (TOC) State
  const [outline, setOutline] = useState<string[]>([]);
  const [showOutline, setShowOutline] = useState(false);
  const [jumpToText, setJumpToText] = useState<string | null>(null);

  // Summarization State
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Audio State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioModeActive, setAudioModeActive] = useState(false); 
  const [audioGenerating, setAudioGenerating] = useState(false);
  
  // Voice Command State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioCacheRef = useRef<Map<number, AudioBuffer>>(new Map()); 
  const fetchQueueRef = useRef<Set<number>>(new Set());
  const audioStartTimeRef = useRef<number>(0);
  const audioStartOffsetRef = useRef<number>(0);

  // Accessibility Announcer State
  const [announcement, setAnnouncement] = useState("");

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);

  // PineX State
  const [pineXMessages, setPineXMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I'm Pine-X. I can help you change settings, navigate the app, or answer general questions. 🍍" }
  ]);

  // Back Press State
  const [backPressCounter, setBackPressCounter] = useState(0); 
  const [showExitToast, setShowExitToast] = useState(false); 

  // Labels for current language
  const labels = UI_TRANSLATIONS[settings.language || 'en'];

  // Listen for global accessibility announcements
  useEffect(() => {
      const handleAnnouncement = (e: any) => {
          setAnnouncement(e.detail);
          // Clear after a moment so the same message can be announced again if needed
          setTimeout(() => setAnnouncement(""), 1000);
      };
      window.addEventListener('accessibility-announcement', handleAnnouncement);
      return () => window.removeEventListener('accessibility-announcement', handleAnnouncement);
  }, []);

  // Handle Tab Switching - Removed automated announcement
  const handleTabChange = useCallback((tab: Tab) => {
      if (tab !== activeTab) { 
          setActiveTab(tab);
      }
  }, [activeTab]);

  // Capacitor Back Button Listener
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
        const handler = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
            if (currentDoc) {
                handleCloseDocumentFixed();
                setBackPressCounter(0);
                setShowExitToast(false);
                return;
            }
            if (activeTab !== Tab.DOCUMENTS) {
                handleTabChange(Tab.DOCUMENTS);
                setBackPressCounter(0);
                setShowExitToast(false);
                return;
            }
            if (activeTab === Tab.DOCUMENTS) {
                if (backPressCounter === 0) {
                    setBackPressCounter(1);
                    setShowExitToast(true);
                    const timer = setTimeout(() => {
                        setBackPressCounter(0);
                        setShowExitToast(false);
                    }, 2000); 
                    return () => clearTimeout(timer); 
                } else if (backPressCounter === 1) {
                    CapacitorApp.exitApp();
                }
            }
        });
        return () => { handler.remove(); };
    }
  }, [activeTab, currentDoc, backPressCounter, handleTabChange]);

  useEffect(() => {
      const hasSeenTour = localStorage.getItem('pine_onboarding_complete');
      const termsAgreed = localStorage.getItem('terms_agreed');
      
      if (termsAgreed === 'true') {
          setHasAgreedToTerms(true);
      }

      if (!hasSeenTour || termsAgreed !== 'true') {
          setShowOnboarding(true);
      }
      
      refreshRecentFiles();
      
      const handlePopState = (event: PopStateEvent) => {
          if (currentDoc) handleCloseDocumentFixed();
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [currentDoc]);

  // Handle Background Processing Status
  useEffect(() => {
    if (currentDoc) {
        // Check processing status on load
        if (currentDoc.metadata.isFullyProcessed === false) {
            setIsBackgroundProcessing(true);
            
            // Re-load the document from storage every few seconds to check for completion
            const interval = setInterval(async () => {
                const updatedDoc = await getParsedDocument(currentDoc.metadata.name);
                if (updatedDoc) {
                    // Update current page data if it changed
                    setCurrentDoc(prev => {
                        if (!prev) return null;
                        // Merge pages carefully to not disrupt current view state excessively
                        return { ...updatedDoc }; 
                    });

                    if (updatedDoc.metadata.isFullyProcessed) {
                        setIsBackgroundProcessing(false);
                        speakSystemMessage("Document enhancement complete.");
                        clearInterval(interval);
                    }
                }
            }, 3000); // Check every 3 seconds
            
            return () => clearInterval(interval);
        } else {
            setIsBackgroundProcessing(false);
        }
    }
  }, [currentDoc?.metadata.name]);

  useEffect(() => {
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === settings.language);
    if (langConfig && window.document.body) {
        window.document.body.style.fontFamily = `'${langConfig.font}', 'Roboto', sans-serif`;
    }
  }, [settings.language]);

  useEffect(() => {
    if (currentDoc) {
        getPineXMessages(currentDoc.metadata.name).then(msgs => {
            if (msgs && msgs.length > 0) {
                setPineXMessages(msgs);
            } else {
                setPineXMessages([{ role: 'model', text: `Hi! I'm Pine-X. I'm ready to help you with "${currentDoc.metadata.name}". Ask me anything. 🍍` }]);
            }
        });
    } else {
        setPineXMessages([{ role: 'model', text: "Hi! I'm Pine-X. I can help you change settings, navigate the app, or answer general questions. 🍍" }]);
    }
  }, [currentDoc?.metadata.name]);

  useEffect(() => {
      if (currentDoc && pineXMessages.length > 1) {
          const timeout = setTimeout(() => {
              savePineXMessages(currentDoc.metadata.name, pineXMessages);
          }, 1000); 
          return () => clearTimeout(timeout);
      }
  }, [pineXMessages, currentDoc]);

  const handleOnboardingComplete = () => {
      if (!hasAgreedToTerms) return;
      localStorage.setItem('pine_onboarding_complete', 'true');
      localStorage.setItem('terms_agreed', 'true');
      setShowOnboarding(false);
  };

  const handleGlobalTouch = (e: TouchEvent) => {
      if (e.touches.length === 3) handleWhereAmI();
  };

  useEffect(() => {
      window.addEventListener('touchstart', handleGlobalTouch);
      return () => window.removeEventListener('touchstart', handleGlobalTouch);
  }, [currentDoc, currentPageIndex]);

  useEffect(() => {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = false;
          recognitionRef.current.lang = settings.language === 'en' ? 'en-US' : settings.language;
          recognitionRef.current.onresult = (event: any) => {
              const transcript = event.results[0][0].transcript.toLowerCase();
              handleVoiceCommand(transcript);
              setIsListening(false);
          };
          recognitionRef.current.onerror = () => setIsListening(false);
          recognitionRef.current.onend = () => setIsListening(false);
      }
  }, [currentDoc, audioModeActive, settings]);

  const handleVoiceCommand = (cmd: string) => {
      triggerHaptic('success');
      if (cmd.includes('stop')) handleExitAudioMode();
      else if (cmd.includes('read') || cmd.includes('play')) handleReadPageButton();
      else if (cmd.includes('next')) changePage(1);
      else if (cmd.includes('previous') || cmd.includes('back')) changePage(-1);
      else if (cmd.includes('dark')) setSettings(s => ({ ...s, colorMode: ColorMode.DARK }));
      else if (cmd.includes('light')) setSettings(s => ({ ...s, colorMode: ColorMode.LIGHT }));
      else if (cmd.includes('bookmark')) handleTabChange(Tab.BOOKMARKS);
  };

  const handleWhereAmI = () => {
      if (!currentDoc) {
          announce("You are in the main menu.");
          return;
      }
      const pageNum = currentPageIndex + 1;
      const total = currentDoc.metadata.pageCount;
      announce(`You are on page ${pageNum} of ${total}.`);
  };

  const announce = (text: string) => {
      announceAccessibilityChange(text);
      triggerHaptic('heavy');
      speakSystemMessage(text);
  };

  const refreshRecentFiles = async () => {
    const files = await getRecentFilesList();
    setRecentFiles(files);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    stopAudio();
    audioCacheRef.current.clear(); 
    setPdfProxy(null);
    setOutline([]); 
    
    try {
        let parsed: ParsedDocument | null = null;
        
        parsed = await getParsedDocument(file.name);

        if (parsed && !parsed.metadata.isFullyProcessed && file.type === 'application/pdf') {
             resumePDFProcessing(file, parsed); 
        }

        if (!parsed) {
            if (file.type.startsWith('image/')) {
                const base64 = await fileToBase64(file);
                const html = await analyzeImage(base64, file.type);
                parsed = {
                    metadata: { name: file.name, type: DocumentType.IMAGE, pageCount: 1, lastReadDate: Date.now(), isFullyProcessed: true },
                    pages: [{ pageNumber: 1, text: "Image Content", semanticHtml: html }],
                    rawText: "Image Content"
                };
                setViewMode('reflow'); 
            } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                parsed = await parsePDF(file); 
                const proxy = await getPDFProxy(file);
                setPdfProxy(proxy);
                setViewMode('reflow');
            } else if (file.name.toLowerCase().endsWith('.docx')) {
                parsed = await parseDocx(file);
                setViewMode('reflow');
            } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
                parsed = await parseExcel(file);
                setViewMode('reflow');
            } else if (file.type === 'application/json' || file.name.toLowerCase().endsWith('.webpage')) {
                const content = await file.text();
                const data = JSON.parse(content);
                parsed = {
                    metadata: { name: data.title, type: DocumentType.WEB_ARTICLE, pageCount: 1, lastReadDate: Date.now(), isFullyProcessed: true },
                    pages: [{ pageNumber: 1, text: data.text, semanticHtml: data.html }],
                    rawText: data.text
                };
                setViewMode('reflow');
            } else {
                parsed = await parseTextFile(file);
                setViewMode('reflow');
            }
        } else {
            if (parsed.metadata.type === DocumentType.PDF) {
                 const proxy = await getPDFProxy(file);
                 setPdfProxy(proxy);
            }
        }

        if (parsed) {
            saveRecentFileToStorage(file); 
            loadDocumentIntoReader(parsed);
            triggerHaptic('success');
        }

    } catch (err) {
        console.error("Error opening file", err);
        triggerHaptic('error');
        alert("Could not parse file. " + err);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleWebUrl = async (url: string, isVisualStory: boolean = false) => {
      setIsProcessing(true);
      setOutline([]);
      try {
          const langName = SUPPORTED_LANGUAGES.find(l => l.code === settings.language)?.name || 'English';
          const content = await fetchWebPageContent(url, langName, isVisualStory);
          
          const contentBlob = new Blob([JSON.stringify({ title: content.title, html: content.html, text: content.text, url })], { type: 'application/json' });
          const fileName = `${content.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.webpage`;
          const webFile = new File([contentBlob], fileName, { type: 'application/json' });
          
          await saveRecentFileToStorage(webFile, {
              name: content.title,
              type: DocumentType.WEB_ARTICLE,
              size: webFile.size,
              lastOpened: Date.now(),
          });

          const parsed: ParsedDocument = {
              metadata: { name: content.title, type: DocumentType.WEB_ARTICLE, pageCount: 1, lastReadDate: Date.now(), isFullyProcessed: true },
              pages: [{
                  pageNumber: 1, text: content.text, semanticHtml: content.html,
                  speechText: optimizeTableForSpeech(content.html)
              }],
              rawText: content.text
          };
          setPdfProxy(null);
          setViewMode('reflow');
          loadDocumentIntoReader(parsed);
          triggerHaptic('success');
      } catch (e) {
          console.error("Web Reader Error", e);
          triggerHaptic('error');
          alert((e as Error).message);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleTranslateArticle = async () => {
    if (!currentDoc || (currentDoc.metadata.type !== DocumentType.WEB_ARTICLE && currentDoc.metadata.type !== DocumentType.WEB)) return;
    
    setIsTranslating(true);
    triggerHaptic('medium');
    
    try {
        const pageContent = currentDoc.pages[0].semanticHtml || currentDoc.pages[0].text;
        const langName = SUPPORTED_LANGUAGES.find(l => l.code === settings.language)?.name || 'English';
        
        const { title: translatedTitle, html: translatedHtml } = await translateSemanticHtml(pageContent, langName);

        const newDoc: ParsedDocument = {
            ...currentDoc,
            metadata: {
                ...currentDoc.metadata,
                name: translatedTitle,
            },
            pages: [{
                ...currentDoc.pages[0],
                semanticHtml: translatedHtml,
                text: translatedHtml.replace(/<[^>]*>/g, ' '), 
                speechText: optimizeTableForSpeech(translatedHtml)
            }]
        };

        setCurrentDoc(newDoc);
        triggerHaptic('success');

    } catch (e) {
        console.error("Translation failed:", e);
        triggerHaptic('error');
        alert("Translation failed. Please try again.");
    } finally {
        setIsTranslating(false);
    }
  };

  const loadDocumentIntoReader = async (parsed: ParsedDocument) => {
      const { pageIndex } = getReadingProgress(parsed.metadata.name);
      const startPage = (pageIndex >= 0 && pageIndex < parsed.metadata.pageCount) ? pageIndex : 0;
      
      setCurrentDoc(parsed);
      setCurrentPageIndex(startPage);
      setReaderControlMode(ReaderControlMode.DOCUMENT_CONTROLS); // Reset controls
      handleTabChange(Tab.DOCUMENTS); 
      window.history.pushState({ view: 'reader' }, '');

      if (parsed.pages[startPage] && parsed.metadata.type !== DocumentType.IMAGE) {
          enhancePage(parsed, startPage);
          setTimeout(() => prepareAudioForPage(parsed, startPage + 1), 2000);
      }

      if (parsed.metadata.tableOfContents && parsed.metadata.tableOfContents.length > 0) {
          setOutline(parsed.metadata.tableOfContents.map(t => t.title));
      } else if (parsed.rawText && parsed.rawText.length > 0 && parsed.metadata.isFullyProcessed) {
          const textSample = parsed.rawText.substring(0, 50000); 
          generateDocumentOutline(textSample).then(toc => {
             if (toc && toc.length > 0) setOutline(toc);
          });
      }
  };

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
      });
  };

  // Fixed handleCloseDocument by removing setShowJumpModal call
  const handleCloseDocumentFixed = () => {
    setCurrentDoc(null);
    setPdfProxy(null);
    // Jump modal state is now managed inside Reader.tsx components, 
    // but app-level close needs to ensure everything is reset.
    // setShowJumpModal was removed.
    setShowOutline(false);
    stopAudio();
    setAudioModeActive(false);
    setIsBackgroundProcessing(false); 
    refreshRecentFiles();
    handleTabChange(Tab.DOCUMENTS);
    setSelectedText(null);
    setSummaryResult(null);
    setReaderControlMode(ReaderControlMode.DOCUMENT_CONTROLS);
  };

  const handleCloseDocument = () => {
      handleCloseDocumentFixed();
  };

  const handleShare = async () => {
      if (!currentDoc) return;
      try {
          if (currentDoc.metadata.type === DocumentType.WEB || currentDoc.metadata.type === DocumentType.WEB_ARTICLE) {
             const shareData = {
                 title: currentDoc.metadata.name,
                 text: `${currentDoc.metadata.name}\n\n${currentDoc.rawText.substring(0, 4000)}...\n\nRead via Pine Reader 🍍`
             };
             if (Capacitor.isNativePlatform()) {
                 await CapacitorShare.share({
                     title: shareData.title,
                     text: shareData.text,
                     dialogTitle: 'Share Article'
                 });
             } else if (navigator.share) {
                 await navigator.share(shareData);
             } else { 
                 await navigator.clipboard.writeText(shareData.text); alert("Text copied!"); 
             }
             return;
          }
          const file = await getStoredFile(currentDoc.metadata.name);
          if (file) {
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({ files: [file], title: currentDoc.metadata.name });
              } else {
                  alert("Sharing not supported directly.");
              }
          }
      } catch (error) { console.error("Error sharing", error); }
  };

  const handleSaveAsPDF = () => {
      triggerHaptic('medium');
      setViewMode('reflow');
      setTimeout(() => window.print(), 100);
  };

  // --- SUMMARIZATION LOGIC ---
  const handleTextSelection = (text: string) => {
    if (text !== selectedText) {
       setSelectedText(text || null);
       if (!text) setSummaryResult(null);
    }
  };

  const handleSummarize = async () => {
      if (!selectedText) return;
      triggerHaptic('medium');
      setIsSummarizing(true);
      setSummaryResult(null); 
      
      try {
          const summary = await summarizeSelection(selectedText);
          setSummaryResult(summary);
      } catch (e) {
          setSummaryResult("Sorry, I couldn't summarize that selection. Please try again.");
      } finally {
          setIsSummarizing(false);
      }
  };

  // NEW: Full Document Summarization
  const handleSummarizeDocument = async () => {
      if (!currentDoc) return;
      
      // Check cache first
      if (currentDoc.metadata.summary) {
          setSummaryResult(currentDoc.metadata.summary);
          setIsSummarizing(false); // Just show modal
          return;
      }

      setIsSummarizing(true);
      setSummaryResult(null); 
      
      try {
          // Use full text (truncated if massive)
          const text = currentDoc.rawText;
          const summary = await generateDocumentSummary(text);
          setSummaryResult(summary);
          
          // Cache it
          const updatedDoc = {
              ...currentDoc,
              metadata: { ...currentDoc.metadata, summary }
          };
          setCurrentDoc(updatedDoc);
          await saveParsedDocument(updatedDoc, updatedDoc.metadata.name);

      } catch (e) {
          setSummaryResult("Could not summarize document at this time.");
      } finally {
          setIsSummarizing(false);
      }
  };

  const handleReadSummaryAloud = async (text: string) => {
      speakSystemMessage(text); // Basic TTS for summary
  };

  const handleAskSummaryFollowUp = () => {
      handleCloseSummary();
      handleTabChange(Tab.PINEX);
      setPineXMessages(prev => [...prev, { role: 'model', text: `Here is the summary of your document:\n\n${summaryResult}\n\nWhat would you like to know more about?` }]);
  };

  const handleCloseSummary = () => {
      if (!isSummarizing) { // Don't close if loading
        setSummaryResult(null);
        setIsSummarizing(false);
      }
  };

  // --- AUDIO LOGIC ---
  const getAudioContext = () => {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      return audioContextRef.current;
  };
  const decodeToAudioBuffer = async (arrayBuffer: ArrayBuffer) => {
      const ctx = getAudioContext();
      const pcmData = new Int16Array(arrayBuffer);
      const buffer = ctx.createBuffer(1, pcmData.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < pcmData.length; i++) channelData[i] = pcmData[i] / 32768.0;
      return buffer;
  }
  const enhancePage = async (doc: ParsedDocument, pageIndex: number) => {
      if (pageIndex < 0 || pageIndex >= doc.pages.length) return;
      const page = doc.pages[pageIndex];
      // Check if page data is actually present (background loading)
      if (!page) return;

      let needsUpdate = false;
      let newPage = { ...page };
      if (!page.semanticHtml) {
          setIsProcessing(true);
          newPage.semanticHtml = await transformTextToSemanticHtml(page.text, settings.readingLevel);
          needsUpdate = true;
      }
      if (!newPage.speechText && newPage.semanticHtml) {
          newPage.speechText = optimizeTableForSpeech(newPage.semanticHtml);
          needsUpdate = true;
      }
      if (needsUpdate) {
          setCurrentDoc(prev => {
              if (!prev) return null;
              // Safe copy
              const newPages = [...prev.pages];
              newPages[pageIndex] = newPage;
              return { ...prev, pages: newPages };
          });
          setIsProcessing(false);
          // Pass updated doc context for audio
          const updatedDoc = { ...doc, pages: [...doc.pages] };
          updatedDoc.pages[pageIndex] = newPage;
          prepareAudioForPage(updatedDoc, pageIndex);
      } else {
          prepareAudioForPage(doc, pageIndex);
      }
  };
  const prepareAudioForPage = async (doc: ParsedDocument, pageIdx: number) => {
      if (pageIdx < 0 || pageIdx >= doc.pages.length) return;
      if (fetchQueueRef.current.has(pageIdx) || audioCacheRef.current.has(pageIdx)) return;
      const fileId = doc.metadata.name;
      const stored = await getAudioData(fileId, pageIdx);
      if (stored) {
          audioCacheRef.current.set(pageIdx, await decodeToAudioBuffer(stored));
          return;
      }
      const page = doc.pages[pageIdx];
      // Only prepare if page is loaded
      if (!page) return;

      const textToSpeak = page.speechText || page.text;
      if (textToSpeak) {
          fetchQueueRef.current.add(pageIdx);
          try {
              const audioBase64 = await generateSpeech(textToSpeak, settings.voiceName || 'Kore');
              if (audioBase64) {
                 const binaryString = window.atob(audioBase64);
                 const len = binaryString.length;
                 const bytes = new Uint8Array(len);
                 for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
                 await saveAudioData(fileId, pageIdx, bytes.buffer);
                 audioCacheRef.current.set(pageIdx, await decodeToAudioBuffer(bytes.buffer));
              }
          } catch (e) { console.error("Audio fetch error", e); }
          finally { fetchQueueRef.current.delete(pageIdx); }
      }
  };
  const playAudioForPage = async (pageIdx: number) => {
      let buffer = audioCacheRef.current.get(pageIdx);
      if (!buffer) {
          setAudioGenerating(true);
          await prepareAudioForPage(currentDoc!, pageIdx);
          buffer = audioCacheRef.current.get(pageIdx);
          setAudioGenerating(false);
      }
      if (buffer) { audioBufferRef.current = buffer; playBufferFrom(0); }
  };
  const playBufferFrom = (offset: number) => {
      const ctx = getAudioContext();
      if (audioSourceRef.current) try { audioSourceRef.current.stop(); } catch(e) {}
      if (!audioBufferRef.current) return;
      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(ctx.destination);
      source.start(0, offset);
      audioStartTimeRef.current = ctx.currentTime;
      audioStartOffsetRef.current = offset;
      audioSourceRef.current = source;
      setIsPlayingAudio(true);
      const currentSource = source;
      source.onended = () => {
         if (audioSourceRef.current === currentSource) {
             const elapsed = ctx.currentTime - audioStartTimeRef.current;
             const duration = audioBufferRef.current?.duration || 0;
             if (elapsed + offset >= duration - 0.5) {
                const nextIdx = currentPageIndex + 1;
                if (nextIdx < (currentDoc?.metadata.pageCount || 0)) {
                    setCurrentPageIndex(nextIdx); playAudioForPage(nextIdx);
                } else setIsPlayingAudio(false);
             } else {
                 setIsPlayingAudio(false);
             }
         }
      };
  };
  const pauseAudio = () => {
      if (audioSourceRef.current) try { audioSourceRef.current.stop(); } catch(e) {}
      setIsPlayingAudio(false);
  };
  const togglePlayPause = () => {
      if (isPlayingAudio) {
          pauseAudio();
      } else {
          const elapsed = audioContextRef.current ? audioContextRef.current.currentTime - audioStartTimeRef.current : 0;
          const current = audioStartOffsetRef.current + elapsed;
          playBufferFrom(current);
      }
  };
  const stopAudio = () => {
      if (audioSourceRef.current) try { audioSourceRef.current.stop(); } catch(e) {}
      setIsPlayingAudio(false); 
      setAudioGenerating(false);
      setAudioModeActive(false);
  };
  const handleReadPageButton = async () => {
    setAudioModeActive(true);
    setReaderControlMode(ReaderControlMode.TTS_PLAYER);
    triggerHaptic('medium'); 
    await playAudioForPage(currentPageIndex);
  };
  const handleExitAudioMode = () => {
      stopAudio(); 
      setReaderControlMode(ReaderControlMode.DOCUMENT_CONTROLS);
      triggerHaptic('medium');
  };
  const handleRewind = (seconds: number = 10) => {
      if (!audioBufferRef.current) return;
      triggerHaptic('light');
      const elapsed = audioContextRef.current ? audioContextRef.current.currentTime - audioStartTimeRef.current : 0;
      const current = audioStartOffsetRef.current + elapsed;
      playBufferFrom(Math.max(0, current - seconds));
  };
  const handleForward = (seconds: number = 10) => {
      if (!audioBufferRef.current) return;
      triggerHaptic('light');
      const elapsed = audioContextRef.current ? audioContextRef.current.currentTime - audioStartTimeRef.current : 0;
      const current = audioStartOffsetRef.current + elapsed;
      playBufferFrom(Math.min(audioBufferRef.current.duration, current + seconds));
  };
  const changePage = (delta: number) => {
      if (!currentDoc) return;
      const newIndex = currentPageIndex + delta;
      if (newIndex >= 0 && newIndex < currentDoc.metadata.pageCount) {
          stopAudio();
          setCurrentPageIndex(newIndex);
          saveReadingProgress(currentDoc.metadata.name, newIndex);
          announce(`Page ${newIndex + 1}`); 
          if (currentDoc.metadata.type !== DocumentType.IMAGE) {
            enhancePage(currentDoc, newIndex);
            setTimeout(() => enhancePage(currentDoc, newIndex + 1), 1000);
          }
          triggerHaptic('medium');
          if (audioModeActive) playAudioForPage(newIndex);
      }
  }

  // PineX Control Logic
  const handlePineXControl = (action: string, params: any) => {
      console.log(`PineX Action: ${action}`, params);
      triggerHaptic('medium');
      let feedback = "Command received.";

      switch (action) {
          case 'NAVIGATE':
              if (params.tab) {
                  const tabKey = params.tab as keyof typeof Tab;
                  handleTabChange(Tab[tabKey]);
                  feedback = `Going to ${params.tab.toLowerCase().replace('_', ' ')}.`;
              }
              if (params.pageNumber && currentDoc) {
                  const target = params.pageNumber - 1;
                  if (target >= 0 && target < currentDoc.metadata.pageCount) {
                      changePage(target - currentPageIndex);
                      feedback = `Jumping to page ${params.pageNumber}.`;
                  }
              }
              break;
          case 'SET_SETTING':
              if (params.key) {
                  setSettings(s => ({ ...s, [params.key]: params.value }));
                  feedback = `Setting updated.`;
              }
              break;
          case 'TTS_CONTROL':
              if (params.command === 'PLAY') { handleReadPageButton(); feedback = "Reading aloud."; }
              if (params.command === 'PAUSE' || params.command === 'STOP') { handleExitAudioMode(); feedback = "Reading stopped."; }
              if (params.command === 'FORWARD') { handleForward(); feedback = "Skipping forward."; }
              if (params.command === 'BACK') { handleRewind(); feedback = "Rewinding."; }
              break;
          case 'SHARE':
              if (params.text) {
                  const shareData = { title: 'Shared via Pine-X', text: params.text, dialogTitle: 'Share' };
                  if (Capacitor.isNativePlatform()) CapacitorShare.share(shareData);
                  else if (navigator.share) navigator.share(shareData);
                  feedback = "Opening share menu.";
              }
              break;
      }
      speakSystemMessage(feedback);
  };

  const isDocOpen = (activeTab === Tab.DOCUMENTS || activeTab === Tab.PINEX) && !!currentDoc;
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  const renderContent = () => {
      if (showOnboarding) {
          return <OnboardingTour 
              settings={settings} 
              onComplete={handleOnboardingComplete} 
              onSetConsent={setHasAgreedToTerms}
              hasAgreedToTerms={hasAgreedToTerms}
          />;
      }
      
      const content = (() => {
        switch (activeTab) {
            case Tab.DOCUMENTS:
                if (currentDoc) {
                    return (
                      <div className="flex flex-col h-full bg-black">
                          {/* Reader takes over header handling for controls */}
                          <main className="flex-1 relative overflow-hidden bg-white dark:bg-black">
                               <Reader 
                                    page={currentDoc.pages[currentPageIndex]} 
                                    pdfProxy={pdfProxy} 
                                    settings={settings}
                                    isProcessing={isProcessing}
                                    onPageChange={changePage}
                                    documentName={currentDoc.metadata.name}
                                    onBookmark={(bm) => saveBookmark(bm)}
                                    viewMode={viewMode}
                                    onDoubleTap={handleExitAudioMode}
                                    jumpToText={jumpToText} 
                                    onTextSelection={handleTextSelection}
                                    
                                    // New Controls Props
                                    readerControlMode={readerControlMode}
                                    setReaderControlMode={setReaderControlMode}
                                    onToggleNightMode={() => setSettings(s => ({ ...s, colorMode: s.colorMode === ColorMode.DARK ? ColorMode.LIGHT : ColorMode.DARK }))}
                                    onToggleViewMode={() => setViewMode(v => v === 'original' ? 'reflow' : 'original')}
                                    onToggleTTS={audioModeActive ? togglePlayPause : handleReadPageButton}
                                    isSpeaking={isPlayingAudio}
                                    onJumpToPage={(p) => changePage(p - currentPageIndex)}
                                    onRewind={handleRewind}
                                    onFastForward={handleForward}
                                    onAskPineX={() => handleTabChange(Tab.PINEX)}
                                    onBack={() => handleCloseDocumentFixed()}
                                    onShare={handleShare}
                                    // New Action
                                    onSummarize={handleSummarizeDocument}
                                />
                          </main>
                          
                          {isBackgroundProcessing && (
                                <div className={clsx(
                                    "absolute bottom-[80px] left-0 right-0 p-2 text-center text-xs font-bold uppercase tracking-wider z-10 animate-pulse pointer-events-none",
                                    settings.colorMode === ColorMode.HIGH_CONTRAST ? "bg-yellow-300 text-black" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                                )}>
                                    <Loader2 className="w-3 h-3 inline-block mr-2 animate-spin" />
                                    Pine-X is enhancing this document...
                                </div>
                          )}

                          {selectedText && !summaryResult && !isSummarizing && (
                             <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[55] animate-in zoom-in-90 duration-300">
                                 <Button 
                                    label="Summarize Selection"
                                    onClick={handleSummarize}
                                    colorMode={settings.colorMode}
                                    className={clsx(
                                        "shadow-2xl !py-3 !px-6 text-lg font-bold rounded-full border-2",
                                        isHighContrast ? "!bg-black !text-yellow-300 !border-yellow-300" : "!bg-[#FFC107] !text-black !border-white"
                                    )}
                                    icon={<Sparkles className="w-5 h-5 mr-1" />}
                                 >
                                     Summarize
                                 </Button>
                             </div>
                          )}

                          {audioGenerating && <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg bg-black/80 text-[#FFC107] flex items-center gap-3 border border-[#FFC107] animate-in fade-in zoom-in-95"><Loader2 className="w-5 h-5 animate-spin" /><span className="font-medium text-sm">Preparing voice...</span></div>}
                          
                          <OutlineView isOpen={showOutline} onClose={() => setShowOutline(false)} outline={outline} onJumpToText={(text) => setJumpToText(text)} settings={settings} />
                          
                          <SummaryModal 
                             isOpen={!!summaryResult || isSummarizing} 
                             onClose={handleCloseSummary} 
                             summaryText={summaryResult} 
                             isLoading={isSummarizing} 
                             settings={settings}
                             onReadAloud={handleReadSummaryAloud}
                             onAskFollowUp={handleAskSummaryFollowUp}
                          />
                      </div>
                    );
                }
                return <DocumentsView onFileUpload={(e) => { const f = e.target.files?.[0]; if(f) processFile(f); }} onResumeFile={async (id) => { const f = await getStoredFile(id); if(f) processFile(f); }} recentFiles={recentFiles} settings={settings} />;
            case Tab.OCR:
                return (
                  <Suspense fallback={<TabLoader />}>
                    <OCRView 
                      settings={settings} 
                      onBack={() => handleTabChange(Tab.DOCUMENTS)} 
                    />
                  </Suspense>
                );
            case Tab.PINEX:
                return (
                  <Suspense fallback={<TabLoader />}>
                    <PineX 
                      pageContext={currentDoc ? `Document: ${currentDoc.metadata.name}\nText:\n${currentDoc.pages[currentPageIndex]?.text}` : undefined} 
                      fullDocText={currentDoc ? currentDoc.rawText : undefined}
                      settings={settings} 
                      isEmbedded={true} 
                      onControlAction={handlePineXControl} 
                      messages={pineXMessages} 
                      onUpdateMessages={setPineXMessages} 
                      onBack={() => handleTabChange(Tab.DOCUMENTS)} 
                    />
                  </Suspense>
                );
            case Tab.BOOKMARKS:
                return (
                  <Suspense fallback={<TabLoader />}>
                    <BookmarksView 
                        settings={settings} 
                        onOpenBookmark={(id, page) => { if(currentDoc && currentDoc.metadata.name === id) { setCurrentPageIndex(page); handleTabChange(Tab.DOCUMENTS); } }} 
                        onBack={() => handleTabChange(Tab.DOCUMENTS)} 
                    />
                  </Suspense>
                );
            case Tab.SETTINGS:
                return (
                  <Suspense fallback={<TabLoader />}>
                    <SettingsPanel 
                        settings={settings} 
                        onUpdateSettings={setSettings} 
                        onBack={() => handleTabChange(Tab.DOCUMENTS)} 
                    />
                  </Suspense>
                );
            case Tab.WEB_READER:
                return (
                  <Suspense fallback={<TabLoader />}>
                    <WebReaderView 
                        settings={settings} 
                        onReadUrl={handleWebUrl} 
                        onBack={() => handleTabChange(Tab.DOCUMENTS)} 
                        onTranslate={handleTranslateArticle}
                        isTranslating={isTranslating}
                    />
                  </Suspense>
                );
            default:
                return null;
        }
      })();

      return (
        <div key={activeTab} className="flex-1 h-full w-full slide-in-right overflow-hidden flex flex-col">
            {content}
        </div>
      );
  };

  return (
    <div className={clsx("h-[100dvh] flex flex-col font-sans transition-colors duration-200 overflow-hidden", THEME_CLASSES[settings.colorMode])}
        onTouchStart={() => {
           if (activeTab !== Tab.DOCUMENTS) setSelectedText(null);
        }}
    >
      <div 
        className="sr-only" 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {announcement}
      </div>

      <div className={clsx("flex-1 flex flex-col relative overflow-hidden", isDocOpen && !audioModeActive && activeTab !== Tab.PINEX && "pb-[0px]")}>
          {renderContent()}
      </div>
      
      {/* 
         BOTTOM NAVIGATION:
         Only visible if:
         1. No document is currently open (isDocOpen is false)
         2. Onboarding is finished
         3. The active tab is DOCUMENTS (this creates the Hub-and-Spoke navigation)
      */}
      {!isDocOpen && !showOnboarding && activeTab === Tab.DOCUMENTS && (
          <BottomNav currentTab={activeTab} onTabChange={handleTabChange} colorMode={settings.colorMode} />
      )}
    
      {showExitToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg shadow-xl z-[10000] opacity-90 transition-opacity duration-300">
            Press back again to exit
        </div>
      )}
    </div>
  );
}
