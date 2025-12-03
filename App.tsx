
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, ArrowLeft, Volume2, StopCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { parsePDF, parseTextFile, parseDocx, parseExcel } from './services/pdfService';
import { transformTextToSemanticHtml, generateSpeech, analyzeImage } from './services/geminiService';
import { saveRecentFileToStorage, getRecentFilesList, getStoredFile, saveReadingProgress, getReadingProgress, StoredFileMetadata } from './services/storageService';
import { ParsedDocument, AppSettings, ColorMode, Tab, DocumentType } from './types';
import { DEFAULT_SETTINGS, THEME_CLASSES } from './constants';
import { Reader } from './components/Reader';
import { Button } from './components/ui/Button';
import { SettingsPanel } from './components/SettingsPanel';
import { PineX } from './components/ChatBot';
import { BottomNav } from './components/BottomNav';
import { DocumentsView } from './components/DocumentsView';
import { JumpToPageModal } from './components/JumpToPageModal';
import { AudioControls } from './components/AudioControls';
import { triggerHaptic } from './services/hapticService';

const AUDIO_BUFFER_AHEAD = 2; // How many pages to preload

export default function App() {
  const [document, setDocument] = useState<ParsedDocument | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Recent Files
  const [recentFiles, setRecentFiles] = useState<StoredFileMetadata[]>([]);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DOCUMENTS);
  
  // Reader Overlay State
  const [showReaderChat, setShowReaderChat] = useState(false);
  const [showJumpModal, setShowJumpModal] = useState(false);

  // Scroll Position State: Map of pageIndex -> scrollTop
  const [pageScrollState, setPageScrollState] = useState<Record<number, number>>({});

  // Audio State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioModeActive, setAudioModeActive] = useState(false); 
  const [audioGenerating, setAudioGenerating] = useState(false); // UI Spinner specific to Audio
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioStartTimeRef = useRef<number>(0);
  const audioPausedAtRef = useRef<number>(0);
  
  // Audio Cache System
  const audioCacheRef = useRef<Map<number, AudioBuffer>>(new Map());
  const fetchQueueRef = useRef<Set<number>>(new Set());

  // Wake Lock Hook
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && document) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.debug('Wake Lock skipped');
      }
    };

    if (document) {
      requestWakeLock();
    }

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
      stopAudio(); 
    };
  }, [document]);

  useEffect(() => {
    refreshRecentFiles();
  }, []);

  const refreshRecentFiles = async () => {
    const files = await getRecentFilesList();
    setRecentFiles(files);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    stopAudio();
    audioCacheRef.current.clear(); // Clear cache on new file
    fetchQueueRef.current.clear();
    
    try {
        let parsed: ParsedDocument;
        const name = file.name.toLowerCase();
        
        if (file.type.startsWith('image/')) {
            const base64 = await fileToBase64(file);
            const html = await analyzeImage(base64, file.type);
            parsed = {
                metadata: {
                    name: file.name,
                    type: DocumentType.IMAGE,
                    pageCount: 1,
                    lastReadDate: Date.now()
                },
                pages: [{ pageNumber: 1, text: "Image Content", semanticHtml: html }],
                rawText: "Image Content"
            };
        } else if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
            parsed = await parsePDF(file);
        } else if (name.endsWith('.docx')) {
            parsed = await parseDocx(file);
        } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            parsed = await parseExcel(file);
        } else {
            parsed = await parseTextFile(file);
        }

        await saveRecentFileToStorage(file);
        await refreshRecentFiles();

        const { pageIndex, scrollTop } = getReadingProgress(file.name);
        const startPage = (pageIndex >= 0 && pageIndex < parsed.pages.length) ? pageIndex : 0;

        setDocument(parsed);
        setCurrentPageIndex(startPage);
        setPageScrollState({ [startPage]: scrollTop });

        if (parsed.pages.length > 0 && parsed.metadata.type !== DocumentType.IMAGE) {
            enhancePage(parsed, startPage);
        }
        triggerHaptic('success');

    } catch (err) {
        console.error("Error opening file", err);
        triggerHaptic('error');
        alert("Could not parse file.");
    } finally {
        setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              resolve(base64);
          };
          reader.onerror = error => reject(error);
      });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleResumeFile = async (fileId: string) => {
      const file = await getStoredFile(fileId);
      if (file) {
          await processFile(file);
      } else {
          alert("File not found in storage.");
          refreshRecentFiles();
      }
  };

  const handleCloseDocument = () => {
    setDocument(null);
    setShowReaderChat(false);
    setShowJumpModal(false);
    setPageScrollState({});
    stopAudio();
    refreshRecentFiles(); 
  };

  const enhancePage = async (doc: ParsedDocument, pageIndex: number) => {
      const page = doc.pages[pageIndex];
      if (!page.semanticHtml) {
          setIsProcessing(true);
          const html = await transformTextToSemanticHtml(page.text);
          
          setDocument(prev => {
              if (!prev) return null;
              const newPages = [...prev.pages];
              newPages[pageIndex] = { ...page, semanticHtml: html };
              return { ...prev, pages: newPages };
          });
          setIsProcessing(false);
      }
  };

  const changePage = async (delta: number) => {
      if (!document) return;
      const newIndex = currentPageIndex + delta;
      jumpToPage(newIndex);
  };
  
  const jumpToPage = (index: number) => {
      if (!document) return;
      if (index >= 0 && index < document.pages.length) {
          if (audioSourceRef.current) {
              try { audioSourceRef.current.stop(); } catch(e) {}
              audioSourceRef.current = null;
          }
          
          setCurrentPageIndex(index);
          const scrollForNewPage = pageScrollState[index] || 0;
          saveReadingProgress(document.metadata.name, index, scrollForNewPage);

          if (document.metadata.type !== DocumentType.IMAGE) {
            enhancePage(document, index);
          }

          triggerHaptic('medium');

          if (audioModeActive) {
             playAudioForPage(index); 
          }
      }
  }

  const handleScrollUpdate = (scrollTop: number) => {
      if (!document) return;
      setPageScrollState(prev => ({ ...prev, [currentPageIndex]: scrollTop }));
      saveReadingProgress(document.metadata.name, currentPageIndex, scrollTop);
  };

  // --------------------------------------------------------------------------------
  // ADVANCED AUDIO ENGINE (Caching, Preload, Queueing)
  // --------------------------------------------------------------------------------

  const getAudioContext = () => {
      if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      }
      return audioContextRef.current;
  };

  const fetchAudioBuffer = async (pageIdx: number): Promise<AudioBuffer | null> => {
      if (!document) return null;
      
      if (audioCacheRef.current.has(pageIdx)) {
          return audioCacheRef.current.get(pageIdx) || null;
      }

      if (fetchQueueRef.current.has(pageIdx)) {
          return null; 
      }

      const page = document.pages[pageIdx];
      if (!page || !page.text.trim()) return null;

      try {
          fetchQueueRef.current.add(pageIdx);
          
          if (pageIdx === currentPageIndex) setAudioGenerating(true);

          // Use the selected voice from settings
          const audioBase64 = await generateSpeech(page.text, settings.voiceName || 'Kore');
          
          if (audioBase64) {
             const ctx = getAudioContext();
             const binaryString = window.atob(audioBase64);
             const len = binaryString.length;
             const bytes = new Uint8Array(len);
             for (let i = 0; i < len; i++) {
                 bytes[i] = binaryString.charCodeAt(i);
             }
             
             const pcmData = new Int16Array(bytes.buffer);
             const buffer = ctx.createBuffer(1, pcmData.length, 24000);
             const channelData = buffer.getChannelData(0);
             for (let i = 0; i < pcmData.length; i++) {
                 channelData[i] = pcmData[i] / 32768.0;
             }
             
             audioCacheRef.current.set(pageIdx, buffer);
             fetchQueueRef.current.delete(pageIdx);
             
             if (pageIdx === currentPageIndex) setAudioGenerating(false);
             return buffer;
          }
      } catch (e) {
          console.error(`TTS failed for page ${pageIdx}`, e);
      } finally {
          fetchQueueRef.current.delete(pageIdx);
          if (pageIdx === currentPageIndex) setAudioGenerating(false);
      }
      return null;
  };

  const preloadUpcomingPages = (startIdx: number) => {
      if (!document) return;
      for (let i = 1; i <= AUDIO_BUFFER_AHEAD; i++) {
          const target = startIdx + i;
          if (target < document.metadata.pageCount) {
              fetchAudioBuffer(target);
          }
      }
  };

  const playAudioForPage = async (pageIdx: number) => {
      let buffer = audioCacheRef.current.get(pageIdx);

      if (!buffer) {
          setAudioGenerating(true);
          buffer = await fetchAudioBuffer(pageIdx);
          setAudioGenerating(false);
      }

      if (buffer) {
          audioBufferRef.current = buffer;
          playBufferFrom(0);
          preloadUpcomingPages(pageIdx);
      }
  };

  const handleReadPageButton = async () => {
    if (audioModeActive) {
        stopAudio();
        return;
    }
    
    setAudioModeActive(true);
    await playAudioForPage(currentPageIndex);
  };

  const playBufferFrom = (offset: number) => {
      const ctx = getAudioContext();
      
      if (audioSourceRef.current) {
          try { audioSourceRef.current.stop(); } catch(e) {}
      }

      if (!audioBufferRef.current) return;

      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(ctx.destination);
      
      const duration = audioBufferRef.current.duration;
      
      source.start(0, offset);
      audioSourceRef.current = source;
      audioStartTimeRef.current = ctx.currentTime - offset;
      audioPausedAtRef.current = 0;
      setIsPlayingAudio(true);

      if ((window as any).audioNextTimer) clearTimeout((window as any).audioNextTimer);
      
      const remainingDuration = duration - offset;
      (window as any).audioNextTimer = setTimeout(() => {
          if (audioSourceRef.current === source && audioModeActive) {
              handleAutoNextPage();
          }
      }, remainingDuration * 1000);
  };

  const handleAutoNextPage = () => {
      if (!document) return;
      const nextIdx = currentPageIndex + 1;
      if (nextIdx < document.metadata.pageCount) {
          setCurrentPageIndex(nextIdx);
          playAudioForPage(nextIdx);
      } else {
          setIsPlayingAudio(false); 
      }
  };

  const togglePlayPause = () => {
      if (isPlayingAudio) {
          // Pause
          if (audioContextRef.current && audioSourceRef.current) {
              audioPausedAtRef.current = audioContextRef.current.currentTime - audioStartTimeRef.current;
              audioSourceRef.current.stop();
              audioSourceRef.current = null;
              if ((window as any).audioNextTimer) clearTimeout((window as any).audioNextTimer);
              setIsPlayingAudio(false);
          }
      } else {
          // Play
          if (audioBufferRef.current) {
              playBufferFrom(audioPausedAtRef.current);
          } else {
              playAudioForPage(currentPageIndex);
          }
      }
  };

  const seek = (seconds: number) => {
      if (!audioContextRef.current || !audioBufferRef.current) return;
      
      triggerHaptic('medium');

      let currentPos = 0;
      if (isPlayingAudio) {
          currentPos = audioContextRef.current.currentTime - audioStartTimeRef.current;
      } else {
          currentPos = audioPausedAtRef.current;
      }

      let newPos = currentPos + seconds;
      
      if (newPos > audioBufferRef.current.duration) {
          handleAutoNextPage();
          return;
      }
      
      if (newPos < 0) newPos = 0;

      if (isPlayingAudio) {
          playBufferFrom(newPos);
      } else {
          audioPausedAtRef.current = newPos;
      }
  };

  const stopAudio = () => {
      if (audioSourceRef.current) {
          try { audioSourceRef.current.stop(); } catch(e) {}
          audioSourceRef.current = null;
      }
      if ((window as any).audioNextTimer) clearTimeout((window as any).audioNextTimer);
      setIsPlayingAudio(false);
      setAudioModeActive(false);
      setAudioGenerating(false);
      audioPausedAtRef.current = 0;
      audioBufferRef.current = null;
  };

  const getRichContext = () => {
      if (!document) return undefined;
      const pages = document.pages;
      const idx = currentPageIndex;
      const total = pages.length;
      const parts = [];

      if (total > 0) parts.push(`--- DOCUMENT START (Page 1) ---\n${pages[0].text.substring(0, 1000)}...`);
      if (idx > 0) parts.push(`--- PREVIOUS PAGE (Page ${idx}) ---\n${pages[idx - 1].text}`);
      if (pages[idx]) parts.push(`--- CURRENT PAGE (Page ${idx + 1}) ---\n${pages[idx].text}`);
      if (idx < total - 1) parts.push(`--- NEXT PAGE (Page ${idx + 1}) ---\n${pages[idx + 1].text}`);
      if (total > 1 && idx !== total - 1) parts.push(`--- DOCUMENT END (Page ${total}) ---\n...${pages[total - 1].text.slice(-1000)}`);
      
      return parts.join('\n\n');
  };

  const currentPage = document?.pages[currentPageIndex];
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  return (
    <div className={clsx("min-h-screen flex flex-col font-sans transition-colors duration-200", THEME_CLASSES[settings.colorMode])}>
      
      {document ? (
        <>
          <header className={clsx(
              "px-4 py-3 border-b sticky top-0 z-40 flex items-center justify-between gap-2",
              isHighContrast ? "bg-black border-yellow-300" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
          )}>
            <div className="flex items-center gap-2 overflow-hidden">
                <Button 
                    label="Back"
                    onClick={handleCloseDocument}
                    colorMode={settings.colorMode}
                    variant="secondary"
                    icon={<ArrowLeft className="w-5 h-5" />}
                    className="shrink-0"
                />
                <h1 className="text-lg font-bold truncate" role="heading" aria-level={1}>
                    {document.metadata.name}
                </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <Button 
                    colorMode={settings.colorMode} 
                    label={audioModeActive ? "Stop Reading" : "Read Page"} 
                    variant={audioModeActive ? "primary" : "secondary"}
                    onClick={handleReadPageButton}
                    icon={audioModeActive ? <StopCircle className="w-5 h-5 animate-pulse" /> : <Volume2 className="w-5 h-5" />}
                />
                <Button 
                    colorMode={settings.colorMode} 
                    label="PineX" 
                    variant="primary"
                    onClick={() => setShowReaderChat(true)}
                    icon={<MessageSquare className="w-5 h-5" />}
                />
            </div>
          </header>

          <Reader 
              page={currentPage} 
              settings={settings}
              isProcessing={isProcessing}
              initialScrollOffset={pageScrollState[currentPageIndex] || 0}
              onScroll={handleScrollUpdate}
          />

          {audioGenerating && (
              <div className={clsx(
                  "fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg flex items-center gap-3",
                  isHighContrast ? "bg-yellow-300 text-black border-2 border-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              )}>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-sm">Processing next pages...</span>
              </div>
          )}

          {audioModeActive ? (
              <AudioControls 
                  isPlaying={isPlayingAudio}
                  onTogglePlay={togglePlayPause}
                  onRewind={() => seek(-10)}
                  onForward={() => seek(10)}
                  onPrevPage={() => changePage(-1)}
                  onNextPage={() => changePage(1)}
                  canPrevPage={currentPageIndex > 0}
                  canNextPage={currentPageIndex < (document.metadata.pageCount - 1)}
                  settings={settings}
              />
          ) : (
              <div className={clsx(
                  "fixed bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none"
              )}>
                  <div className={clsx(
                      "flex items-center gap-2 px-6 py-2 rounded-full shadow-xl pointer-events-auto border",
                      isHighContrast ? "bg-black border-yellow-300" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  )}>
                      <Button 
                          colorMode={settings.colorMode} 
                          label="Previous Page" 
                          variant="secondary"
                          onClick={() => changePage(-1)}
                          disabled={currentPageIndex === 0}
                          icon={<ChevronLeft className="w-6 h-6" />}
                          className="rounded-full w-10 h-10 p-0"
                      />
                      
                      <Button 
                          colorMode={settings.colorMode}
                          label={`Page ${currentPageIndex + 1} of ${document.metadata.pageCount}`}
                          variant="ghost"
                          onClick={() => setShowJumpModal(true)}
                          className="font-bold min-w-[80px] text-center"
                      >
                          {currentPageIndex + 1} / {document.metadata.pageCount}
                      </Button>

                      <Button 
                          colorMode={settings.colorMode} 
                          label="Next Page" 
                          variant="secondary"
                          onClick={() => changePage(1)}
                          disabled={currentPageIndex === (document.metadata.pageCount - 1)}
                          icon={<ChevronRight className="w-6 h-6" />}
                          className="rounded-full w-10 h-10 p-0"
                      />
                  </div>
              </div>
          )}

          {showReaderChat && (
              <PineX 
                  pageContext={getRichContext()} 
                  settings={settings} 
                  isEmbedded={false}
                  onClose={() => setShowReaderChat(false)}
              />
          )}

          <JumpToPageModal 
              isOpen={showJumpModal}
              onClose={() => setShowJumpModal(false)}
              onJump={jumpToPage}
              currentPage={currentPageIndex}
              totalPages={document.metadata.pageCount}
              settings={settings}
          />
        </>
      ) : (
        <>
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {activeTab === Tab.DOCUMENTS && (
                    <DocumentsView 
                        onFileUpload={handleFileUpload}
                        onResumeFile={handleResumeFile}
                        recentFiles={recentFiles}
                        settings={settings}
                    />
                )}
                {activeTab === Tab.PINEX && (
                    <PineX 
                        settings={settings}
                        isEmbedded={true}
                    />
                )}
                {activeTab === Tab.SETTINGS && (
                    <SettingsPanel 
                        settings={settings}
                        onUpdateSettings={setSettings}
                    />
                )}
            </main>

            <BottomNav 
                currentTab={activeTab} 
                onTabChange={setActiveTab} 
                colorMode={settings.colorMode}
            />
        </>
      )}

    </div>
  );
}
