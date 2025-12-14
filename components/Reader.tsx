
import React, { useEffect, useRef, useState } from 'react';
import { PageData, ReaderControlMode, Tab, ColorMode, Bookmark, ReaderProps } from '../types';
import clsx from 'clsx';
import { THEME_CLASSES, SUPPORTED_LANGUAGES } from '../constants';
import { triggerHaptic } from '../services/hapticService';
import { getSemanticLookup } from '../services/geminiService';
import DOMPurify from 'dompurify';
import { Loader2, ChevronLeft, ChevronRight, MoreHorizontal, MessageSquareText, X, Moon, Sun, Volume2, Bookmark as BookmarkIcon, FileText, Play, Pause, SkipBack, SkipForward, Search, ArrowLeft, Share } from 'lucide-react';
import { Button } from './ui/Button';
import { JumpToPageModal } from './JumpToPageModal';

// --- CONTROL BARS COMPONENTS ---

const DocumentControlsBar: React.FC<ReaderProps> = ({ 
    onPageChange, setReaderControlMode, onJumpToPage, settings, page, pdfProxy 
}) => {
    const [showJump, setShowJump] = useState(false);
    const iconClass = "w-6 h-6";
    // Base button style for bottom bar items
    const buttonClass = clsx(
        "flex flex-col items-center justify-center p-2 text-xs flex-1 gap-1 transition-colors active:scale-95",
        settings.colorMode === ColorMode.HIGH_CONTRAST ? "hover:bg-yellow-900/50" : "hover:bg-black/5 dark:hover:bg-white/10"
    );
    
    return (
        <>
            <div className={clsx(
                "flex justify-around items-center border-t py-2 h-[80px] pb-safe backdrop-blur-md",
                settings.colorMode === ColorMode.HIGH_CONTRAST 
                    ? "bg-black border-t-2 border-yellow-300 text-yellow-300" 
                    : "bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
            )}>
                <button onClick={() => { triggerHaptic('light'); onPageChange(-1); }} className={buttonClass} aria-label="Previous Page">
                    <ChevronLeft className={iconClass} />
                    <span className="font-medium">Prev</span>
                </button>
                
                <button onClick={() => { triggerHaptic('light'); setShowJump(true); }} className={buttonClass} aria-label="Jump to Page">
                    <Search className={iconClass} />
                    <span className="font-medium">Jump To</span>
                </button>
                
                <button onClick={() => { triggerHaptic('light'); onPageChange(1); }} className={buttonClass} aria-label="Next Page">
                    <ChevronRight className={iconClass} />
                    <span className="font-medium">Next</span>
                </button>
                
                <button onClick={() => { triggerHaptic('light'); setReaderControlMode(ReaderControlMode.MORE_OPTIONS); }} className={buttonClass} aria-label="More Options">
                    <MoreHorizontal className={iconClass} />
                    <span className="font-medium">More</span>
                </button>
            </div>

            <JumpToPageModal 
                isOpen={showJump}
                onClose={() => setShowJump(false)}
                onJump={onJumpToPage}
                currentPage={page?.pageNumber ? page.pageNumber - 1 : 0}
                totalPages={pdfProxy?.numPages || 1} // Fallback
                settings={settings}
            />
        </>
    );
};

const MoreOptionsBar: React.FC<ReaderProps> = ({ 
    onToggleNightMode, onToggleViewMode, onToggleTTS, setReaderControlMode, settings, onBookmark, documentName, page
}) => {
    const iconClass = "w-6 h-6";
    const buttonClass = clsx(
        "flex flex-col items-center justify-center p-2 text-xs flex-1 gap-1 transition-colors active:scale-95",
        settings.colorMode === ColorMode.HIGH_CONTRAST ? "hover:bg-yellow-900/50" : "hover:bg-black/5 dark:hover:bg-white/10"
    );
    
    const nightModeText = settings.colorMode === ColorMode.DARK ? "Light" : "Night"; 
    
    // Quick Bookmark action from menu
    const handleQuickBookmark = () => {
        if(page) {
            triggerHaptic('success');
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
    };

    return (
        <div className={clsx(
            "flex justify-around items-center border-t py-2 h-[80px] pb-safe backdrop-blur-md animate-in slide-in-from-bottom duration-200",
            settings.colorMode === ColorMode.HIGH_CONTRAST 
                ? "bg-black border-t-2 border-yellow-300 text-yellow-300" 
                : "bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
        )}>
            
            <button onClick={() => { triggerHaptic('medium'); onToggleViewMode(); }} className={buttonClass} aria-label="Toggle View Mode">
                <FileText className={iconClass} />
                <span className="font-medium">{settings.viewMode === 'accessible' ? "Original" : "Text"}</span>
            </button>

            <button onClick={() => { triggerHaptic('medium'); onToggleNightMode(); }} className={buttonClass} aria-label={`${nightModeText} Mode`}>
                {settings.colorMode === ColorMode.DARK ? <Sun className={iconClass} /> : <Moon className={iconClass} />}
                <span className="font-medium">{nightModeText}</span>
            </button>

            <button onClick={() => { triggerHaptic('medium'); onToggleTTS(); }} className={buttonClass} aria-label="Read Aloud">
                <Volume2 className={iconClass} />
                <span className="font-medium">Read</span>
            </button>

            <button onClick={handleQuickBookmark} className={buttonClass} aria-label="Add Bookmark">
                <BookmarkIcon className={iconClass} />
                <span className="font-medium">Mark</span>
            </button>

            <button onClick={() => { triggerHaptic('light'); setReaderControlMode(ReaderControlMode.DOCUMENT_CONTROLS); }} className={buttonClass} aria-label="Close Options">
                <X className={iconClass} />
                <span className="font-medium">Close</span>
            </button>
        </div>
    );
};

const TTSPlayerBar: React.FC<ReaderProps> = ({ 
    onPageChange, onToggleTTS, isSpeaking, setReaderControlMode, onRewind, onFastForward, settings 
}) => {
    const iconClass = "w-6 h-6";
    const buttonClass = clsx(
        "flex flex-col items-center justify-center p-2 text-xs flex-1 gap-1 transition-colors active:scale-95",
        settings.colorMode === ColorMode.HIGH_CONTRAST ? "hover:bg-yellow-900/50" : "hover:bg-black/5 dark:hover:bg-white/10"
    );
    
    // Default to 10s if not set
    const seekSeconds = settings.seekDuration || 10;

    return (
        <div className={clsx(
            "flex justify-around items-center border-t py-2 h-[80px] pb-safe backdrop-blur-md animate-in slide-in-from-bottom duration-200",
            settings.colorMode === ColorMode.HIGH_CONTRAST 
                ? "bg-black border-t-2 border-yellow-300 text-yellow-300" 
                : "bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
        )}>
            <button onClick={() => { triggerHaptic('light'); onPageChange(-1); }} className={buttonClass} aria-label="Previous Page">
                <ChevronLeft className={iconClass} />
                <span className="font-medium">Prev</span>
            </button>
            
            <button onClick={() => { triggerHaptic('medium'); onRewind(seekSeconds); }} className={buttonClass} aria-label={`Rewind ${seekSeconds} seconds`}>
                <SkipBack className={iconClass} />
                <span className="font-medium">-{seekSeconds}s</span>
            </button>

            <button onClick={() => { triggerHaptic('medium'); onToggleTTS(); }} className={clsx(buttonClass, !isSpeaking && "text-blue-600 dark:text-blue-400")} aria-label={isSpeaking ? "Pause" : "Play"}>
                {isSpeaking ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
                <span className="font-medium">{isSpeaking ? "Pause" : "Play"}</span>
            </button>
            
            <button onClick={() => { triggerHaptic('medium'); onFastForward(seekSeconds); }} className={buttonClass} aria-label={`Fast Forward ${seekSeconds} seconds`}>
                <SkipForward className={iconClass} />
                <span className="font-medium">+{seekSeconds}s</span>
            </button>
            
            <button onClick={() => { triggerHaptic('light'); onPageChange(1); }} className={buttonClass} aria-label="Next Page">
                <ChevronRight className={iconClass} />
                <span className="font-medium">Next</span>
            </button>

            <button onClick={() => { triggerHaptic('light'); setReaderControlMode(ReaderControlMode.MORE_OPTIONS); }} className={buttonClass} aria-label="Close Player">
                <X className={iconClass} />
                <span className="font-medium">Close</span>
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
    onShare
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
  
  // 3-Finger Gesture State
  const last3FingerTapTime = useRef(0);

  // Semantic Lookup State
  const [lookupResult, setLookupResult] = useState<{ text: string, x: number, y: number } | null>(null);

  const isPageReady = page && page.semanticHtml && page.text;
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  // Sanitize HTML Content
  const sanitizedHtml = React.useMemo(() => {
      if (!isPageReady) return '';
      const rawHtml = page?.semanticHtml || `<p>${page?.text}</p>`;
      return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
  }, [page?.semanticHtml, page?.text, isPageReady]);

  // Accessibility: Focus sync
  useEffect(() => {
     if (semanticRef.current) {
         semanticRef.current.focus({ preventScroll: true });
     }
  }, [page?.pageNumber, isPageReady]);

  // Jump to Text (TOC) Effect
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

  // Render Visual Layer (Canvas)
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

  // --- SELECTION LOGIC ---
  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 10 && onTextSelection) {
        onTextSelection(selection.toString().trim());
    } else if (onTextSelection) {
        onTextSelection("");
    }
  };

  // --- GESTURE LOGIC ---
  const announceStatus = (text: string) => {
      triggerHaptic('medium');
      // Using generic synthesis for now, ideally hook into app announcer
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
          touchStartRef.current = {
              x: touch.clientX,
              y: touch.clientY,
              time: Date.now()
          };
          isLongPressActiveRef.current = false;

          longPressTimerRef.current = setTimeout(() => {
              isLongPressActiveRef.current = true;
              handleBookmarkGesture(e.target as HTMLElement);
          }, settings.longPressDuration || 3000);

          tapCountRef.current += 1;
          clearTimeout(tapTimerRef.current);
          
          tapTimerRef.current = setTimeout(() => {
              if (tapCountRef.current === 2) {
                 if (onDoubleTap) {
                     triggerHaptic('medium');
                     onDoubleTap();
                 }
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

      if (diffX > 10 || diffY > 10) {
          clearTimeout(longPressTimerRef.current);
      }
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
          if (diffX > 0) {
              onPageChange(-1);
              announceStatus(`Page ${page!.pageNumber - 1}`);
          } else {
              onPageChange(1);
              announceStatus(`Page ${page!.pageNumber + 1}`);
          }
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
          if (el.tagName.match(/^H[1-6]$/)) {
              type = 'HEADING';
              text = el.innerText;
              break;
          }
          if (el.tagName === 'A') {
              type = 'LINK';
              text = el.innerText;
              break;
          }
          if (el.tagName === 'TABLE') {
              type = 'TABLE';
              text = "Table on this page"; 
              break;
          }
          el = el.parentElement;
      }

      const bookmark: Bookmark = {
          id: Date.now().toString(),
          fileId: documentName,
          fileName: documentName,
          text: text ? text.substring(0, 100) : `Page ${page.pageNumber}`,
          type: type,
          pageNumber: page.pageNumber,
          timestamp: Date.now()
      };

      onBookmark(bookmark);
      announceStatus("Bookmarked");
  };

  // --- SEMANTIC LOOKUP ---
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
            const x = rect.left + rect.width / 2;
            const y = rect.top; 
            handleSemanticLookup(selectedText, x, y);
        }
    };
    
    contentElement.addEventListener('mouseup', handleMouseUp);
    return () => {
        contentElement.removeEventListener('mouseup', handleMouseUp);
    };
  }, [page?.pageNumber, isPageReady]);

  return (
    <div className={clsx("h-full flex flex-col relative", THEME_CLASSES[settings.colorMode])}>
        
        {/* TOP HEADER */}
        <div className={clsx(
            "flex items-center p-3 border-b shrink-0 z-20 shadow-sm",
            isHighContrast ? "bg-black border-yellow-300" : "bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-800"
        )}>
            <Button
                label="Back"
                onClick={onBack}
                colorMode={settings.colorMode}
                variant="ghost"
                icon={<ArrowLeft className={clsx("w-6 h-6", isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white")} />}
                className="shrink-0 p-1"
            />
            <h1 className={clsx(
                "text-base font-bold truncate flex-1 text-center mx-2", 
                isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white"
            )}>
                {documentName}
            </h1>
            
            <Button
                label="Share"
                onClick={onShare}
                colorMode={settings.colorMode}
                variant="ghost"
                icon={<Share className={clsx("w-6 h-6", isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white")} />}
                className="shrink-0 p-1"
            />
        </div>

        {/* PAGE CONTENT AREA */}
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
                <div className="p-4 min-h-full pb-32">
                    {!isPageReady ? (
                        <div className="flex items-center justify-center h-[50vh] flex-col p-10 text-center opacity-70">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p className="text-lg font-medium">Loading Page {page?.pageNumber}...</p>
                            <p className="text-sm mt-2">Pine-X is enhancing this section.</p>
                        </div>
                    ) : (
                        <>
                            {lookupResult && (
                                <div 
                                    className={clsx(
                                        "fixed p-4 rounded-xl shadow-2xl max-w-xs z-50 transition-opacity duration-300 animate-in fade-in zoom-in-95",
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
                                    "semantic-content prose max-w-none focus:outline-none select-text mt-4",
                                    settings.colorMode === ColorMode.HIGH_CONTRAST ? "high-contrast" : "dark:prose-invert",
                                    viewMode === 'original' && "sr-only"
                                )}
                                style={{ 
                                    fontSize: `${settings.fontSize}rem`,
                                    ...fontStyle 
                                }}
                                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                                aria-label={`Page ${page?.pageNumber} content`}
                            />

                            {viewMode === 'original' && (
                                <div className="mt-4 flex justify-center">
                                    <canvas ref={canvasRef} className="shadow-lg max-w-full" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
        
        {/* BOTTOM CONTROL BAR CONTAINER */}
        <div className="absolute bottom-0 left-0 right-0 z-30">
            {readerControlMode === ReaderControlMode.DOCUMENT_CONTROLS && (
                <DocumentControlsBar {...props} />
            )}

            {readerControlMode === ReaderControlMode.MORE_OPTIONS && (
                <MoreOptionsBar {...props} />
            )}

            {readerControlMode === ReaderControlMode.TTS_PLAYER && (
                <TTSPlayerBar {...props} />
            )}
        </div>
        
        {/* Floating Ask Pine-X Button */}
        {readerControlMode === ReaderControlMode.DOCUMENT_CONTROLS && (
            <button
                onClick={() => { triggerHaptic('medium'); onAskPineX(); }}
                className={clsx(
                    "absolute bottom-24 right-4 p-4 rounded-full shadow-2xl transition-transform duration-300 active:scale-95 z-40 border-2",
                    isHighContrast 
                        ? "bg-yellow-300 text-black border-white"
                        : "bg-blue-600 text-white border-transparent hover:bg-blue-700"
                )}
                aria-label="Ask Pine-X Chat Assistant"
            >
                <MessageSquareText className="w-6 h-6 fill-current" />
            </button>
        )}
    </div>
  );
};
