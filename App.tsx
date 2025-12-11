import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, Volume2, Share, Bookmark as BookmarkIcon, FileText, ImageIcon, Play, Pause, SkipBack, SkipForward, Download, Moon, Sun, X, Bot, MoreHorizontal, List, Type, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { parsePDF, parseTextFile, parseDocx, parseExcel, getPDFProxy } from './services/pdfService';
import { transformTextToSemanticHtml, generateSpeech, analyzeImage, optimizeTableForSpeech, fetchWebPageContent, generateDocumentOutline } from './services/geminiService';
import { saveRecentFileToStorage, getRecentFilesList, getStoredFile, saveReadingProgress, getReadingProgress, StoredFileMetadata, saveBookmark, getAudioData, saveAudioData, getPineXMessages, savePineXMessages } from './services/storageService';
import { ParsedDocument, AppSettings, ColorMode, Tab, DocumentType, ChatMessage } from './types';
import { DEFAULT_SETTINGS, THEME_CLASSES, UI_TRANSLATIONS, SUPPORTED_LANGUAGES } from './constants';
import { Reader } from './components/Reader';
import { Button } from './components/ui/Button';
import { SettingsPanel } from './components/SettingsPanel';
import { PineX } from './components/ChatBot';
import { BottomNav } from './components/BottomNav';
import { DocumentsView } from './components/DocumentsView';
import { JumpToPageModal } from './components/JumpToPageModal';
import { BookmarksView } from './components/BookmarksView';
import { WebReaderView } from './components/WebReaderView';
import { OutlineView } from './components/OutlineView';
import { triggerHaptic } from './services/hapticService';
import { OnboardingTour } from './components/OnboardingTour';

export default function App() {
  const [currentDoc, setCurrentDoc] = useState<ParsedDocument | null>(null);
  const [pdfProxy, setPdfProxy] = useState<any>(null); 
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [viewMode, setViewMode] = useState<'original' | 'reflow'>('reflow');
  const [recentFiles, setRecentFiles] = useState<StoredFileMetadata[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DOCUMENTS);
  const [showJumpModal, setShowJumpModal] = useState(false);

  // Outline (TOC) State
  const [outline, setOutline] = useState<string[]>([]);
  const [showOutline, setShowOutline] = useState(false);
  const [jumpToText, setJumpToText] = useState<string | null>(null);

  // Dock State
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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

  // PineX State
  const [pineXMessages, setPineXMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I’m PineX. I’ve read your document. Ask me anything. 🍍" }
  ]);

  // Labels for current language
  const labels = UI_TRANSLATIONS[settings.language || 'en'];

  useEffect(() => {
      const hasSeenTour = localStorage.getItem('pine_onboarding_complete');
      if (!hasSeenTour) setShowOnboarding(true);
      refreshRecentFiles();
      
      const handlePopState = (event: PopStateEvent) => {
          if (currentDoc) handleCloseDocument();
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [currentDoc]);

  // Apply Language Font globally
  useEffect(() => {
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === settings.language);
    if (langConfig && window.document.body) {
        window.document.body.style.fontFamily = `'${langConfig.font}', 'Roboto', sans-serif`;
    }
  }, [settings.language]);

  // Chat Persistence: Load on Doc Open
  useEffect(() => {
    if (currentDoc) {
        getPineXMessages(currentDoc.metadata.name).then(msgs => {
            if (msgs && msgs.length > 0) {
                setPineXMessages(msgs);
            } else {
                setPineXMessages([{ role: 'model', text: "Hi! I’m PineX. I’ve read your document. Ask me anything. 🍍" }]);
            }
        });
    }
  }, [currentDoc?.metadata.name]);

  // Chat Persistence: Save on Update
  useEffect(() => {
      if (currentDoc && pineXMessages.length > 1) {
          const timeout = setTimeout(() => {
              savePineXMessages(currentDoc.metadata.name, pineXMessages);
          }, 1000); // Debounce save
          return () => clearTimeout(timeout);
      }
  }, [pineXMessages, currentDoc]);

  const handleOnboardingComplete = () => {
      localStorage.setItem('pine_onboarding_complete', 'true');
      setShowOnboarding(false);
  };

  const handleGlobalTouch = (e: TouchEvent) => {
      if (e.touches.length === 3) handleWhereAmI();
  };

  useEffect(() => {
      window.addEventListener('touchstart', handleGlobalTouch);
      return () => window.removeEventListener('touchstart', handleGlobalTouch);
  }, [currentDoc, currentPageIndex]);

  // Voice Recognition Init
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
      else if (cmd.includes('bookmark')) setActiveTab(Tab.BOOKMARKS);
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
      setAnnouncement(text);
      setTimeout(() => setAnnouncement(""), 1000);
      triggerHaptic('heavy');
      const u = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
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
    setShowMoreMenu(false);
    setOutline([]); // Clear outline
    
    try {
        let parsed: ParsedDocument;
        const name = file.name.toLowerCase();
        
        if (file.type.startsWith('image/')) {
            const base64 = await fileToBase64(file);
            const html = await analyzeImage(base64, file.type);
            parsed = {
                metadata: { name: file.name, type: DocumentType.IMAGE, pageCount: 1, lastReadDate: Date.now() },
                pages: [{ pageNumber: 1, text: "Image Content", semanticHtml: html }],
                rawText: "Image Content"
            };
            setViewMode('reflow'); 
        } else if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
            parsed = await parsePDF(file);
            const proxy = await getPDFProxy(file);
            setPdfProxy(proxy);
            setViewMode('reflow');
        } else if (name.endsWith('.docx')) {
            parsed = await parseDocx(file);
            setViewMode('reflow');
        } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            parsed = await parseExcel(file);
            setViewMode('reflow');
        } else {
            parsed = await parseTextFile(file);
            setViewMode('reflow');
        }

        saveRecentFileToStorage(file);
        loadDocumentIntoReader(parsed);
        triggerHaptic('success');

    } catch (err) {
        console.error("Error opening file", err);
        triggerHaptic('error');
        alert("Could not parse file. " + err);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleWebUrl = async (url: string) => {
      setIsProcessing(true);
      setShowMoreMenu(false);
      setOutline([]);
      try {
          const langName = SUPPORTED_LANGUAGES.find(l => l.code === settings.language)?.name || 'English';
          const content = await fetchWebPageContent(url, langName);
          const parsed: ParsedDocument = {
              metadata: { name: content.title, type: DocumentType.WEB, pageCount: 1, lastReadDate: Date.now() },
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

  const loadDocumentIntoReader = async (parsed: ParsedDocument) => {
      const { pageIndex } = getReadingProgress(parsed.metadata.name);
      const startPage = (pageIndex >= 0 && pageIndex < parsed.pages.length) ? pageIndex : 0;
      setCurrentDoc(parsed);
      setCurrentPageIndex(startPage);
      setActiveTab(Tab.DOCUMENTS);
      window.history.pushState({ view: 'reader' }, '');

      if (parsed.pages.length > 0 && parsed.metadata.type !== DocumentType.IMAGE) {
          enhancePage(parsed, startPage);
          setTimeout(() => prepareAudioForPage(parsed, startPage + 1), 2000);
      }

      // Generate Outline (Async)
      if (parsed.rawText && parsed.rawText.length > 0) {
          const textSample = parsed.rawText.substring(0, 50000); // Limit context for outline
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

  const handleCloseDocument = () => {
    setCurrentDoc(null);
    setPdfProxy(null);
    setShowJumpModal(false);
    setShowOutline(false);
    stopAudio();
    setAudioModeActive(false);
    setShowMoreMenu(false);
    refreshRecentFiles();
    setActiveTab(Tab.DOCUMENTS);
  };

  const handleShare = async () => {
      if (!currentDoc) return;
      try {
          if (currentDoc.metadata.type === DocumentType.WEB) {
             const shareData = {
                 title: currentDoc.metadata.name,
                 text: `${currentDoc.metadata.name}\n\n${currentDoc.rawText.substring(0, 4000)}...\n\nRead via Pine Reader 🍍`
             };
             if (navigator.share) await navigator.share(shareData);
             else { await navigator.clipboard.writeText(shareData.text); alert("Text copied!"); }
             return;
          }
          const file = await getStoredFile(currentDoc.metadata.name);
          if (file && navigator.share && navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: currentDoc.metadata.name });
          } else {
             alert("Sharing not supported directly.");
          }
      } catch (error) { console.error("Error sharing", error); }
  };

  const handleSaveAsPDF = () => {
      triggerHaptic('medium');
      setViewMode('reflow');
      setTimeout(() => window.print(), 100);
      setShowMoreMenu(false);
  };

  const toggleNightMode = () => {
      triggerHaptic('light');
      setSettings(s => ({
          ...s,
          colorMode: s.colorMode === ColorMode.DARK ? ColorMode.LIGHT : ColorMode.DARK
      }));
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
      let needsUpdate = false;
      let newPage = { ...page };
      if (!page.semanticHtml) {
          setIsProcessing(true);
          newPage.semanticHtml = await transformTextToSemanticHtml(page.text);
          needsUpdate = true;
      }
      if (!newPage.speechText && newPage.semanticHtml) {
          newPage.speechText = optimizeTableForSpeech(newPage.semanticHtml);
          needsUpdate = true;
      }
      if (needsUpdate) {
          setCurrentDoc(prev => prev ? ({ ...prev, pages: prev.pages.map((p, i) => i === pageIndex ? newPage : p) }) : null);
          setIsProcessing(false);
          prepareAudioForPage({ ...doc, pages: [...doc.pages, newPage] } as any, pageIndex);
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
                // Audio finished naturally, go to next page
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
          // Resume
          const elapsed = audioContextRef.current ? audioContextRef.current.currentTime - audioStartTimeRef.current : 0;
          const current = audioStartOffsetRef.current + elapsed;
          playBufferFrom(current);
      }
  };
  const stopAudio = () => {
      if (audioSourceRef.current) try { audioSourceRef.current.stop(); } catch(e) {}
      setIsPlayingAudio(false); setAudioGenerating(false);
  };
  const handleReadPageButton = async () => {
    setAudioModeActive(true); 
    setShowMoreMenu(false);
    triggerHaptic('medium'); 
    await playAudioForPage(currentPageIndex);
  };
  const handleExitAudioMode = () => {
      stopAudio(); setAudioModeActive(false); triggerHaptic('medium');
  };
  const handleRewind = () => {
      if (!audioBufferRef.current) return;
      triggerHaptic('light');
      const elapsed = audioContextRef.current ? audioContextRef.current.currentTime - audioStartTimeRef.current : 0;
      const current = audioStartOffsetRef.current + elapsed;
      playBufferFrom(Math.max(0, current - 10));
  };
  const handleForward = () => {
      if (!audioBufferRef.current) return;
      triggerHaptic('light');
      const elapsed = audioContextRef.current ? audioContextRef.current.currentTime - audioStartTimeRef.current : 0;
      const current = audioStartOffsetRef.current + elapsed;
      playBufferFrom(Math.min(audioBufferRef.current.duration, current + 10));
  };
  const changePage = (delta: number) => {
      if (!currentDoc) return;
      const newIndex = currentPageIndex + delta;
      if (newIndex >= 0 && newIndex < currentDoc.pages.length) {
          stopAudio();
          setCurrentPageIndex(newIndex);
          saveReadingProgress(currentDoc.metadata.name, newIndex);
          announce(`Page ${newIndex + 1}`); // Use Announcer
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
      triggerHaptic('medium');
      if (action === 'setTheme') setSettings(s => ({ ...s, colorMode: params.mode as ColorMode }));
      if (action === 'navigateApp') setActiveTab(Tab[params.destination as keyof typeof Tab]);
      if (action === 'setFontSize') setSettings(s => ({ ...s, fontSize: params.action === 'increase' ? s.fontSize + 0.2 : s.fontSize - 0.2 }));
  };

  const isReadingMode = (activeTab === Tab.DOCUMENTS || activeTab === Tab.PINEX) && !!currentDoc;
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;
  const isDarkMode = settings.colorMode === ColorMode.DARK;

  const renderContent = () => {
      if (showOnboarding) {
          return <OnboardingTour settings={settings} onComplete={handleOnboardingComplete} />;
      }
      switch (activeTab) {
          case Tab.DOCUMENTS:
              if (currentDoc) {
                  return (
                    <div className="flex flex-col h-full bg-black">
                         {/* FINAL HEADER: Back, Title, Share (Fixed Top Bar) */}
                         <header className={clsx(
                            "px-4 py-3 shrink-0 flex items-center justify-between gap-4 z-20 shadow-md",
                            isHighContrast ? "bg-black border-b border-yellow-300" : "bg-gray-900 border-b border-gray-800 text-white"
                        )}>
                            <Button label={labels.back} onClick={() => window.history.back()} colorMode={settings.colorMode} variant="ghost" icon={<ArrowLeft className={clsx("w-6 h-6", isHighContrast ? "text-yellow-300" : "text-white")} />} className="shrink-0 p-1" />
                            <h1 className={clsx("text-base font-bold truncate flex-1 text-center", isHighContrast ? "text-yellow-300" : "text-white")}>{currentDoc.metadata.name}</h1>
                            <Button label={labels.share} onClick={handleShare} colorMode={settings.colorMode} variant="ghost" icon={<Share className={clsx("w-6 h-6", isHighContrast ? "text-yellow-300" : "text-white")} />} className="shrink-0 p-1" />
                        </header>

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
                                  jumpToText={jumpToText} // Pass jump prop
                              />
                        </main>

                        {/* FINAL BOTTOM DOCK */}
                        <div className={clsx(
                            "shrink-0 py-3 px-2 z-50",
                            isHighContrast ? "bg-black border-t-2 border-yellow-300" : "bg-gray-900 border-t border-gray-800"
                        )}>
                            {audioModeActive ? (
                                // AUDIO PLAYER DOCK
                                <div className="flex items-center justify-between gap-2 max-w-lg mx-auto relative px-2">
                                    <Button label={labels.prevPage} variant="ghost" colorMode={settings.colorMode} onClick={() => changePage(-1)} disabled={currentPageIndex === 0} icon={<ChevronLeft className="w-6 h-6 text-[#FFC107]" />} />
                                    <Button label={labels.rewind} variant="ghost" colorMode={settings.colorMode} onClick={handleRewind} icon={<SkipBack className="w-6 h-6 text-[#FFC107]" />} />
                                    <Button 
                                        label={isPlayingAudio ? labels.stop : labels.read} 
                                        variant="ghost" 
                                        colorMode={settings.colorMode} 
                                        onClick={togglePlayPause} 
                                        icon={isPlayingAudio ? <Pause className="w-8 h-8 text-[#FFC107] fill-[#FFC107]" /> : <Play className="w-8 h-8 text-[#FFC107] fill-[#FFC107]" />} 
                                    />
                                    <Button label={labels.forward} variant="ghost" colorMode={settings.colorMode} onClick={handleForward} icon={<SkipForward className="w-6 h-6 text-[#FFC107]" />} />
                                    <Button label={labels.nextPage} variant="ghost" colorMode={settings.colorMode} onClick={() => changePage(1)} disabled={currentPageIndex === currentDoc.metadata.pageCount - 1} icon={<ChevronRight className="w-6 h-6 text-[#FFC107]" />} />
                                    
                                    {/* Close Audio Mode */}
                                    <button 
                                        onClick={handleExitAudioMode}
                                        className="absolute -top-12 right-0 p-2 bg-red-600 rounded-full shadow-lg text-white hover:bg-red-700 touch-target"
                                        aria-label={labels.close}
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            ) : (
                                // MAIN DOCK (4 Big Buttons)
                                <div className="grid grid-cols-4 gap-4 h-16 items-center max-w-lg mx-auto">
                                    <Button label={labels.prevPage} variant="ghost" colorMode={settings.colorMode} onClick={() => changePage(-1)} disabled={currentPageIndex === 0} icon={<ChevronLeft className="w-10 h-10 text-[#FFC107]" />} className="h-full w-full" />
                                    <Button label={labels.askPinex} variant="ghost" colorMode={settings.colorMode} onClick={() => setActiveTab(Tab.PINEX)} icon={<Bot className="w-10 h-10 text-[#FFC107]" />} className="h-full w-full" />
                                    <Button label={labels.nextPage} variant="ghost" colorMode={settings.colorMode} onClick={() => changePage(1)} disabled={currentPageIndex === currentDoc.metadata.pageCount - 1} icon={<ChevronRight className="w-10 h-10 text-[#FFC107]" />} className="h-full w-full" />
                                    <Button label={labels.more} variant="ghost" colorMode={settings.colorMode} onClick={() => setShowMoreMenu(true)} icon={<MoreHorizontal className="w-10 h-10 text-[#FFC107]" />} className="h-full w-full" />
                                </div>
                            )}
                        </div>
                        {audioGenerating && <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg bg-black/80 text-[#FFC107] flex items-center gap-3 border border-[#FFC107]"><Loader2 className="w-5 h-5 animate-spin" /><span className="font-medium text-sm">Preparing voice...</span></div>}
                        
                        <JumpToPageModal isOpen={showJumpModal} onClose={() => setShowJumpModal(false)} onJump={(i) => changePage(i - currentPageIndex)} currentPage={currentPageIndex} totalPages={currentDoc.metadata.pageCount} settings={settings} />
                        <OutlineView isOpen={showOutline} onClose={() => setShowOutline(false)} outline={outline} onJumpToText={(text) => setJumpToText(text)} settings={settings} />

                        {/* MORE MENU SHEET (Vertical Modal) */}
                        {showMoreMenu && (
                            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowMoreMenu(false)}>
                                <div 
                                    className={clsx(
                                        "w-full max-w-lg rounded-t-2xl p-4 animate-in slide-in-from-bottom-10 duration-300 border-t-2",
                                        isHighContrast ? "bg-black border-yellow-300 text-yellow-300" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                                    )}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h3 className="text-xl font-bold">Options</h3>
                                        <Button label={labels.close} variant="ghost" colorMode={settings.colorMode} onClick={() => setShowMoreMenu(false)} icon={<X className="w-6 h-6" />} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button label={labels.read} variant="secondary" colorMode={settings.colorMode} onClick={handleReadPageButton} icon={<Volume2 className="w-6 h-6" />} className="justify-start px-4 py-4 text-lg" />
                                        
                                        {/* Outline Button */}
                                        <Button label="Table of Contents" variant="secondary" colorMode={settings.colorMode} onClick={() => { setShowMoreMenu(false); setShowOutline(true); }} icon={<List className="w-6 h-6" />} className="justify-start px-4 py-4 text-lg" />
                                        
                                        <Button label={labels.savePdf} variant="secondary" colorMode={settings.colorMode} onClick={handleSaveAsPDF} icon={<Download className="w-6 h-6" />} className="justify-start px-4 py-4 text-lg" />
                                        
                                        <Button 
                                            label={viewMode === 'original' ? labels.viewReflow : labels.viewOriginal} 
                                            variant="secondary" 
                                            colorMode={settings.colorMode} 
                                            onClick={() => setViewMode(v => v === 'original' ? 'reflow' : 'original')} 
                                            icon={viewMode === 'original' ? <FileText className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />} 
                                            className="justify-start px-4 py-4 text-lg" 
                                        />
                                        
                                        <Button 
                                            label={isDarkMode ? labels.lightMode : labels.nightMode}
                                            variant="secondary" 
                                            colorMode={settings.colorMode} 
                                            onClick={toggleNightMode} 
                                            icon={isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />} 
                                            className="justify-start px-4 py-4 text-lg" 
                                        />
                                        
                                        <Button label={labels.bookmarks} variant="secondary" colorMode={settings.colorMode} onClick={() => setActiveTab(Tab.BOOKMARKS)} icon={<BookmarkIcon className="w-6 h-6" />} className="justify-start px-4 py-4 text-lg" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                  );
              }
              return <DocumentsView onFileUpload={(e) => { const f = e.target.files?.[0]; if(f) processFile(f); }} onResumeFile={async (id) => { const f = await getStoredFile(id); if(f) processFile(f); }} recentFiles={recentFiles} settings={settings} />;
          case Tab.PINEX:
              return <PineX pageContext={currentDoc ? `Document: ${currentDoc.metadata.name}\nText:\n${currentDoc.pages[currentPageIndex]?.text}` : undefined} settings={settings} isEmbedded={true} onControlAction={handlePineXControl} messages={pineXMessages} onUpdateMessages={setPineXMessages} onBack={currentDoc ? () => setActiveTab(Tab.DOCUMENTS) : undefined} />;
          case Tab.BOOKMARKS:
              return <BookmarksView settings={settings} onOpenBookmark={(id, page) => { if(currentDoc && currentDoc.metadata.name === id) { setCurrentPageIndex(page); setActiveTab(Tab.DOCUMENTS); } }} onBack={currentDoc ? () => setActiveTab(Tab.DOCUMENTS) : undefined} />;
          case Tab.SETTINGS:
              return <SettingsPanel settings={settings} onUpdateSettings={setSettings} />;
          case Tab.WEB_READER:
              return <WebReaderView settings={settings} onReadUrl={handleWebUrl} />;
          default:
              return null;
      }
  };

  return (
    <div className={clsx("h-[100dvh] flex flex-col font-sans transition-colors duration-200 overflow-hidden", THEME_CLASSES[settings.colorMode])}>
      {/* Hidden Aria Live Region for TalkBack announcements */}
      <div 
        className="sr-only" 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {announcement}
      </div>

      <div className={clsx("flex-1 flex flex-col relative overflow-hidden", !isReadingMode && "pb-[80px]")}>
          {renderContent()}
      </div>
      {!isReadingMode && !showOnboarding && <BottomNav currentTab={activeTab} onTabChange={setActiveTab} colorMode={settings.colorMode} />}
    </div>
  );
}