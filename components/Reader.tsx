
import React, { useEffect, useRef, useState } from 'react';
import { PageData, ReaderControlMode, Tab, ColorMode, Bookmark, ReaderProps } from '../types';
import clsx from 'clsx';
import { THEME_CLASSES, SUPPORTED_LANGUAGES } from '../constants';
import { triggerHaptic } from '../services/hapticService';
import { getSemanticLookup } from '../services/geminiService';
import DOMPurify from 'dompurify';
import { Loader2, ChevronLeft, ChevronRight, MoreHorizontal, MessageSquareText, X, Moon, Sun, Volume2, Bookmark as BookmarkIcon, FileText, Play, Pause, SkipBack, SkipForward, Search, ArrowLeft, Share, Sparkles, Lightbulb } from 'lucide-react';
import { Button } from './ui/Button';
import { JumpToPageModal } from './JumpToPageModal';

// --- CONTROL BARS COMPONENTS ---

const DocumentControlsBar: React.FC<ReaderProps> = ({ 
    onPageChange, setReaderControlMode, onJumpToPage, settings, page, pdfProxy, onSummarize 
}) => {
    const [showJump, setShowJump] = useState(false);
    const iconClass = "w-7 h-7";
    
    // Standardized Button Style for Bar
    const BarButton = ({ icon, label, onClick, highlight = false }: any) => (
        <button 
            onClick={() => { triggerHaptic('light'); onClick(); }} 
            className={clsx(
                "flex flex-col items-center justify-center h-full flex-1 gap-1 transition-all active:scale-90 rounded-2xl mx-1",
                highlight 
                    ? (settings.colorMode === ColorMode.HIGH_CONTRAST ? "bg-yellow-300 text-black font-bold" : "bg-[#FFC107]/20 text-black dark:text-[#FFC107]") 
                    : (settings.colorMode === ColorMode.HIGH_CONTRAST ? "text-yellow-300 hover:bg-yellow-900/30" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5")
            )}
            aria-label={label}
        >
            {icon}
            <span className="text-[10px] font-bold tracking-wide text-center leading-tight">{label}</span>
        </button>
    );
    
    return (
        <>
            <div className={clsx(
                "flex justify-between items-center px-2 py-2 min-h-[90px] h-auto pb-safe backdrop-blur-xl border-t z-50",
                settings.colorMode === ColorMode.HIGH_CONTRAST 
                    ? "bg-black border-yellow-300" 
                    : "bg-white/95 dark:bg-[#151515]/95 border-gray-100 dark:border-gray-800 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]"
            )}>
                <BarButton icon={<ChevronLeft className={iconClass} />} label="Prev" onClick={() => onPageChange(-1)} />
                <BarButton icon={<Sparkles className={iconClass} />} label="Summary" onClick={onSummarize} highlight />
                <BarButton icon={<Search className={iconClass} />} label="Jump" onClick={() => setShowJump(true)} />
                <BarButton icon={<ChevronRight className={iconClass} />} label="Next" onClick={() => onPageChange(1)} />
                <BarButton icon={<MoreHorizontal className={iconClass} />} label="More" onClick={() => setReaderControlMode(ReaderControlMode.MORE_OPTIONS)} />
            </div>

            <JumpToPageModal 
                isOpen={showJump}
                onClose={() => setShowJump(false)}
                onJump={onJumpToPage}
                currentPage={page?.pageNumber ? page.pageNumber - 1 : 0}
                totalPages={pdfProxy?.numPages || 1} 
                settings={settings}
            />
        </>
    );
};

const MoreOptionsBar: React.FC<ReaderProps> = ({ 
    onToggleNightMode, onToggleViewMode, onToggleTTS, setReaderControlMode, settings, onBookmark, page, documentName
}) => {
    const iconClass = "w-7 h-7";
    const BarButton = ({ icon, label, onClick }: any) => (
        <button 
            onClick={() => { triggerHaptic('medium'); onClick(); }} 
            className={clsx(
                "flex flex-col items-center justify-center h-full flex-1 gap-1 transition-all active:scale-90 rounded-2xl mx-1",
                settings.colorMode === ColorMode.HIGH_CONTRAST ? "text-yellow-300 hover:bg-yellow-900/30" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
            )}
            aria-label={label}
        >
            {icon}
            <span className="text-[10px] font-bold tracking-wide text-center leading-tight">{label}</span>
        </button>
    );

    return (
        <div className={clsx(
            "flex justify-between items-center px-2 py-2 min-h-[90px] h-auto pb-safe backdrop-blur-xl border-t z-50 animate-in slide-in-from-bottom duration-200",
            settings.colorMode === ColorMode.HIGH_CONTRAST 
                ? "bg-black border-yellow-300" 
                : "bg-white/95 dark:bg-[#151515]/95 border-gray-100 dark:border-gray-800"
        )}>
            <BarButton icon={<FileText className={iconClass} />} label={settings.viewMode === 'accessible' ? "Original" : "Text"} onClick={onToggleViewMode} />
            <BarButton icon={settings.colorMode === ColorMode.DARK ? <Sun className={iconClass} /> : <Moon className={iconClass} />} label={settings.colorMode === ColorMode.DARK ? "Light" : "Night"} onClick={onToggleNightMode} />
            <BarButton icon={<Volume2 className={iconClass} />} label="Read" onClick={onToggleTTS} />
            <BarButton icon={<BookmarkIcon className={iconClass} />} label="Mark" onClick={() => { 
                if(page) {
                    onBookmark({
                        id: Date.now().toString(),
                        fileId: documentName,
                        fileName: documentName,
                        text: `Page ${page.pageNumber}`,
                        type: 'TEXT',
                        pageNumber: page.pageNumber,
                        timestamp: Date.now(),
                        summary: "Bookmarked via menu"
                    });
                    setReaderControlMode(ReaderControlMode.DOCUMENT_CONTROLS);
                }
            }} />
            <BarButton icon={<X className={iconClass} />} label="Close" onClick={() => setReaderControlMode(ReaderControlMode.DOCUMENT_CONTROLS)} />
        </div>
    );
};

const TTSPlayerBar: React.FC<ReaderProps> = ({ 
    onPageChange, onToggleTTS, isSpeaking, setReaderControlMode, onRewind, onFastForward, settings 
}) => {
    const iconClass = "w-8 h-8";
    const seekSeconds = settings.seekDuration || 10;

    return (
        <div className={clsx(
            "flex justify-evenly items-center px-4 py-2 min-h-[90px] h-auto pb-safe backdrop-blur-xl border-t z-50 animate-in slide-in-from-bottom duration-200",
            settings.colorMode === ColorMode.HIGH_CONTRAST 
                ? "bg-black border-yellow-300 text-yellow-300" 
                : "bg-white/95 dark:bg-[#151515]/95 border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200"
        )}>
            <button onClick={() => { triggerHaptic('light'); onPageChange(-1); }} className="p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/10"><ChevronLeft className="w-6 h-6" /></button>
            <button onClick={() => { triggerHaptic('medium'); onRewind(seekSeconds); }} className="p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/10"><SkipBack className="w-7 h-7" /></button>
            
            <button 
                onClick={() => { triggerHaptic('medium'); onToggleTTS(); }} 
                className={clsx(
                    "w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform",
                    settings.colorMode === ColorMode.HIGH_CONTRAST ? "bg-yellow-300 text-black" : "bg-[#FFC107] text-black"
                )}
            >
                {isSpeaking ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </button>
            
            <button onClick={() => { triggerHaptic('medium'); onFastForward(seekSeconds); }} className="p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/10"><SkipForward className="w-7 h-7" /></button>
            <button onClick={() => { triggerHaptic('light'); onPageChange(1); }} className="p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/10"><ChevronRight className="w-6 h-6" /></button>
            
            <button 
                onClick={() => setReaderControlMode(ReaderControlMode.MORE_OPTIONS)} 
                className="absolute top-0 right-2 p-2 rounded-full opacity-50 hover:opacity-100"
                aria-label="Close Player"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
};

// --- MAIN READER COMPONENT ---

export const Reader: React.FC<ReaderProps> = (props) => {
  const {
    page,
    pdfProxy,
    settings,
    isProcessing,
    onPageChange,
    documentName,
    onBookmark,
    viewMode,
    onDoubleTap,
    jumpToText,
    onTextSelection,
    readerControlMode,
    setReaderControlMode,
    onAskPineX,
    onBack,
    onShare,
    onSummarize
  } = props;

  const [scale, setScale] = React.useState(1.0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const semanticRef = useRef<HTMLDivElement>(null);
  
  // Gestures State
  const touchStartRef = useRef<{x: number, y: number, time: number} | null>(null);
  const longPressTimerRef = useRef<any>(null);
  const isLongPressActiveRef = useRef(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<any>(null);
  const last3FingerTapTime = useRef(0);
  const [lookupResult, setLookupResult] = useState<{ text: string, x: number, y: number } | null>(null);

  const isPageReady = page && page.semanticHtml && page.text;
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  const sanitizedHtml = React.useMemo(() => {
      if (!isPageReady) return '';
      const rawHtml = page?.semanticHtml || `<p>${page?.text}</p>`;
      return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
  }, [page?.semanticHtml, page?.text, isPageReady]);

  useEffect(() => {
     if (semanticRef.current) {
         semanticRef.current.focus({ preventScroll: true });
     }
  }, [page?.pageNumber, isPageReady]);

  useEffect(() => {
      if (jumpToText && semanticRef.current && isPageReady) {
          const elements = semanticRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
          for (let i = 0; i < elements.length; i++) {
              const el = elements[i] as HTMLElement;
              if (el.textContent && el.textContent.includes(jumpToText)) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  el.focus();
                  el.classList.add('bg-yellow-200', 'dark:bg-yellow-800'); 
                  setTimeout(() => el.classList.remove('bg-yellow-200', 'dark:bg-yellow-800'), 2000);
                  break;
              }
          }
      }
  }, [jumpToText, page?.pageNumber, isPageReady]);

  const fontStyle = React.useMemo(() => {
      const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === settings.language);
      return langConfig ? { fontFamily: `'${langConfig.font}', 'Roboto', sans-serif` } : {};
  }, [settings.language]);

  useEffect(() => {
      if (viewMode === 'original' && pdfProxy && page && canvasRef.current && isPageReady) {
          const renderPage = async () => {
              try {
                  const pdfPage = await pdfProxy.getPage(page.pageNumber);
                  const viewport = pdfPage.getViewport({ scale: 1.0 });
                  const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
                  const pixelRatio = window.devicePixelRatio || 1;
                  const fitScale = (containerWidth - 32) / viewport.width; 
                  const finalScale = fitScale * scale;
                  const scaledViewport = pdfPage.getViewport({ scale: finalScale });

                  const canvas = canvasRef.current!;
                  const context = canvas.getContext('2d');

                  if (context) {
                      canvas.height = scaledViewport.height * pixelRatio;
                      canvas.width = scaledViewport.width * pixelRatio;
                      canvas.style.height = `${scaledViewport.height}px`;
                      canvas.style.width = `${scaledViewport.width}px`;
                      context.scale(pixelRatio, pixelRatio);
                      await pdfPage.render({ canvasContext: context, viewport: scaledViewport }).promise;
                  }
              } catch (e) {
                  console.error("Render error", e);
              }
          };
          renderPage();
      }
  }, [page, pdfProxy, scale, viewMode, settings.colorMode, isPageReady]);

  // Gestures
  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 10 && onTextSelection) {
        onTextSelection(selection.toString().trim());
    } else if (onTextSelection) {
        onTextSelection("");
    }
  };

  const announceStatus = (text: string) => {
      triggerHaptic('medium');
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          window.speechSynthesis.speak(utterance);
      }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 3) {
          const now = Date.now();
          if (now - last3FingerTapTime.current < 500) {
              handleWhereAmI(); 
              last3FingerTapTime.current = 0; 
          } else {
              last3FingerTapTime.current = now;
          }
          return; 
      }

      if (e.touches.length === 1) {
          const touch = e.touches[0];
          touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
          isLongPressActiveRef.current = false;
          longPressTimerRef.current = setTimeout(() => {
              isLongPressActiveRef.current = true;
              handleBookmarkGesture(e.target as HTMLElement);
          }, settings.longPressDuration || 3000);
          tapCountRef.current += 1;
          clearTimeout(tapTimerRef.current);
          tapTimerRef.current = setTimeout(() => {
              if (tapCountRef.current === 2) {
                 if (onDoubleTap) { triggerHaptic('medium'); onDoubleTap(); }
              }
              tapCountRef.current = 0;
          }, 400); 
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      const diffX = Math.abs(touch.clientX - touchStartRef.current.x);
      const diffY = Math.abs(touch.clientY - touchStartRef.current.y);
      if (diffX > 10 || diffY > 10) clearTimeout(longPressTimerRef.current);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      clearTimeout(longPressTimerRef.current);
      handleSelection();
      if (!touchStartRef.current || isLongPressActiveRef.current) return;
      const touch = e.changedTouches[0];
      const diffX = touch.clientX - touchStartRef.current.x;
      const diffY = touch.clientY - touchStartRef.current.y;
      const timeDiff = Date.now() - touchStartRef.current.time;
      if (Math.abs(diffX) > 50 && timeDiff < 500 && Math.abs(diffX) > Math.abs(diffY) * 2) {
          if (diffX > 0) { onPageChange(-1); announceStatus(`Page ${page!.pageNumber - 1}`); } 
          else { onPageChange(1); announceStatus(`Page ${page!.pageNumber + 1}`); }
      }
      touchStartRef.current = null;
  };

  const handleWhereAmI = () => {
      if (!page) return;
      let contextInfo = `You are on page ${page.pageNumber}. `;
      const firstLine = page.text.trim().split('\n')[0].substring(0, 50);
      contextInfo += `Section starting with: ${firstLine}...`;
      announceStatus(contextInfo);
  };

  const handleBookmarkGesture = (target: HTMLElement) => {
      if (!page) return;
      let text = target.innerText;
      let type: Bookmark['type'] = 'TEXT';
      let el: HTMLElement | null = target;
      while (el && el !== containerRef.current) {
          if (el.tagName.match(/^H[1-6]$/)) { type = 'HEADING'; text = el.innerText; break; }
          if (el.tagName === 'A') { type = 'LINK'; text = el.innerText; break; }
          if (el.tagName === 'TABLE') { type = 'TABLE'; text = "Table on this page"; break; }
          el = el.parentElement;
      }
      onBookmark({
          id: Date.now().toString(),
          fileId: documentName,
          fileName: documentName,
          text: text ? text.substring(0, 100) : `Page ${page.pageNumber}`,
          type: type,
          pageNumber: page.pageNumber,
          timestamp: Date.now()
      });
      announceStatus("Bookmarked");
  };

  const handleSemanticLookup = async (selectedText: string, clientX: number, clientY: number) => {
    if (!selectedText.trim()) return;
    setLookupResult({ text: 'Thinking...', x: clientX, y: clientY });
    triggerHaptic('light');
    const context = page?.text || '';
    const definition = await getSemanticLookup(selectedText, context);
    setLookupResult({ text: definition, x: clientX, y: clientY });
    triggerHaptic('success');
    setTimeout(() => setLookupResult(null), 6000); 
  };

  useEffect(() => {
    const contentElement = semanticRef.current;
    if (!contentElement) return;
    const handleMouseUp = (e: MouseEvent) => {
        setLookupResult(null); 
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        if (selectedText && selectedText.length > 0 && selectedText.length < 50 && contentElement.contains(selection.focusNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            handleSemanticLookup(selectedText, rect.left + rect.width / 2, rect.top);
        }
    };
    contentElement.addEventListener('mouseup', handleMouseUp);
    return () => { contentElement.removeEventListener('mouseup', handleMouseUp); };
  }, [page?.pageNumber, isPageReady]);

  return (
    <div className={clsx("h-full flex flex-col relative", THEME_CLASSES[settings.colorMode])}>
        
        {/* NEW MODERN HEADER */}
        <div className={clsx(
            "flex items-center justify-between p-4 border-b shrink-0 z-20 shadow-sm",
            isHighContrast ? "bg-black border-yellow-300" : "bg-white/95 dark:bg-[#151515]/95 border-gray-100 dark:border-gray-800 backdrop-blur-md"
        )}>
            <div className="flex items-center gap-4 flex-1">
                <Button
                    label="Back"
                    onClick={onBack}
                    colorMode={settings.colorMode}
                    variant="ghost"
                    icon={<ArrowLeft className={clsx("w-6 h-6", isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white")} />}
                    className="shrink-0 p-2 rounded-full"
                />
                
                <h1 className={clsx(
                    "text-lg font-bold truncate max-w-[200px]",
                    isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white"
                )}>
                    {documentName}
                </h1>
            </div>
            
            <div className="flex items-center gap-2">
                <Button
                    label="Share"
                    onClick={onShare}
                    colorMode={settings.colorMode}
                    variant="ghost"
                    icon={<Share className={clsx("w-6 h-6", isHighContrast ? "text-yellow-300" : "text-gray-600 dark:text-gray-300")} />}
                    className="shrink-0 p-2 rounded-full"
                />
            </div>
        </div>

        {/* PAGE CONTENT */}
        <div 
            ref={containerRef}
            className="flex-1 overflow-y-auto relative outline-none touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseUp={handleSelection}
        >
            {isProcessing ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Loader2 className="animate-spin w-12 h-12 text-blue-500" />
                    <p className="text-lg font-medium animate-pulse">Analyzing structure...</p>
                </div>
            ) : (
                <div className="p-4 sm:p-6 min-h-full pb-32">
                    {!isPageReady ? (
                        <div className="flex items-center justify-center h-[50vh] flex-col p-10 text-center opacity-70">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p className="text-lg font-medium">Loading Page {page?.pageNumber}...</p>
                        </div>
                    ) : (
                        <>
                            {lookupResult && (
                                <div 
                                    className={clsx(
                                        "fixed p-4 rounded-3xl shadow-2xl max-w-xs z-50 transition-opacity duration-300 animate-in fade-in zoom-in-95",
                                        settings.colorMode === ColorMode.HIGH_CONTRAST 
                                            ? "bg-yellow-300 text-black font-bold border-4 border-black" 
                                            : "bg-[#FFC107] text-black font-medium border border-black/10"
                                    )}
                                    style={{
                                        left: `${lookupResult.x}px`,
                                        top: `${lookupResult.y - 15}px`,
                                        transform: 'translate(-50%, -100%)',
                                    }}
                                    role="tooltip"
                                >
                                    <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#FFC107]" />
                                    {lookupResult.text}
                                </div>
                            )}

                            <div 
                                ref={semanticRef}
                                tabIndex={0}
                                className={clsx(
                                    "semantic-content prose max-w-none focus:outline-none select-text mt-2 mx-auto",
                                    settings.colorMode === ColorMode.HIGH_CONTRAST ? "high-contrast" : "dark:prose-invert",
                                    viewMode === 'original' && "sr-only"
                                )}
                                style={{ fontSize: `${settings.fontSize}rem`, ...fontStyle }}
                                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                                aria-label={`Page ${page?.pageNumber} content`}
                            />

                            {viewMode === 'original' && (
                                <div className="mt-4 flex justify-center">
                                    <canvas ref={canvasRef} className="shadow-lg max-w-full rounded-xl" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
        
        {/* BOTTOM CONTROLS */}
        <div className="absolute bottom-0 left-0 right-0 z-30">
            {readerControlMode === ReaderControlMode.DOCUMENT_CONTROLS && <DocumentControlsBar {...props} />}
            {readerControlMode === ReaderControlMode.MORE_OPTIONS && <MoreOptionsBar {...props} />}
            {readerControlMode === ReaderControlMode.TTS_PLAYER && <TTSPlayerBar {...props} />}
        </div>
        
        {/* Floating Ask Pine-X Button - Moved to Safe Area */}
        {readerControlMode === ReaderControlMode.DOCUMENT_CONTROLS && (
            <button
                onClick={() => { triggerHaptic('medium'); onAskPineX(); }}
                className={clsx(
                    "absolute bottom-28 right-5 w-16 h-16 rounded-full shadow-2xl transition-transform duration-300 active:scale-95 z-40 flex items-center justify-center",
                    isHighContrast 
                        ? "bg-yellow-300 text-black border-4 border-white"
                        : "bg-black text-[#FFC107] dark:bg-[#FFC107] dark:text-black hover:scale-105"
                )}
                aria-label="Ask Pine-X Chat Assistant"
            >
                <MessageSquareText className="w-8 h-8 fill-current" />
            </button>
        )}
    </div>
  );
};
