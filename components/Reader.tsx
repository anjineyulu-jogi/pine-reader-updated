
import React, { useEffect, useRef } from 'react';
import { PageData, AppSettings, ColorMode, Bookmark } from '../types';
import clsx from 'clsx';
import { THEME_CLASSES, SUPPORTED_LANGUAGES } from '../constants';
import { triggerHaptic } from '../services/hapticService';
import { ReaderProps } from '../types';

export const Reader: React.FC<ReaderProps> = ({
  page,
  pdfProxy,
  settings,
  isProcessing,
  onPageChange,
  documentName,
  onBookmark,
  viewMode,
  onDoubleTap,
  jumpToText
}) => {
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

  // Accessibility: Focus sync
  useEffect(() => {
     if (semanticRef.current) {
         semanticRef.current.focus({ preventScroll: true });
     }
  }, [page?.pageNumber]);

  // Jump to Text (TOC) Effect
  useEffect(() => {
      if (jumpToText && semanticRef.current) {
          // Find element containing the text
          const elements = semanticRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
          for (let i = 0; i < elements.length; i++) {
              const el = elements[i] as HTMLElement;
              if (el.textContent && el.textContent.includes(jumpToText)) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  el.focus();
                  el.classList.add('bg-yellow-200', 'dark:bg-yellow-800'); // Highlight
                  setTimeout(() => el.classList.remove('bg-yellow-200', 'dark:bg-yellow-800'), 2000);
                  break;
              }
          }
      }
  }, [jumpToText, page?.pageNumber]);

  // Determine Font Family based on Settings
  const fontStyle = React.useMemo(() => {
      const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === settings.language);
      return langConfig ? { fontFamily: `'${langConfig.font}', 'Roboto', sans-serif` } : {};
  }, [settings.language]);

  // Render Visual Layer (Canvas)
  useEffect(() => {
      if (viewMode === 'original' && pdfProxy && page && canvasRef.current) {
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
  }, [page, pdfProxy, scale, viewMode, settings.colorMode]);

  // --- GESTURE LOGIC ---

  const announceStatus = (text: string, hapticType: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'none' = 'medium') => {
      if (hapticType !== 'none') {
        triggerHaptic(hapticType as any);
      }
      // Speech Feedback - For interface announcements only
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          window.speechSynthesis.speak(utterance);
      }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      // 3-Finger Double Tap Detection (Where Am I?)
      if (e.touches.length === 3) {
          const now = Date.now();
          if (now - last3FingerTapTime.current < 500) {
              handleWhereAmI(); // Trigger action
              last3FingerTapTime.current = 0; // Reset
          } else {
              last3FingerTapTime.current = now;
          }
          return; 
      }

      // Single Finger Logic
      if (e.touches.length === 1) {
          const touch = e.touches[0];
          touchStartRef.current = {
              x: touch.clientX,
              y: touch.clientY,
              time: Date.now()
          };
          isLongPressActiveRef.current = false;

          // Long Press Logic (Bookmark)
          longPressTimerRef.current = setTimeout(() => {
              isLongPressActiveRef.current = true;
              handleBookmarkGesture(e.target as HTMLElement);
          }, settings.longPressDuration || 3000);

          // Tap Logic (Double Tap 1 Finger -> Stop Reading)
          tapCountRef.current += 1;
          clearTimeout(tapTimerRef.current);
          
          tapTimerRef.current = setTimeout(() => {
              // Timer finished
              if (tapCountRef.current === 2) {
                 // Double Tap -> Stop Reading
                 if (onDoubleTap) {
                     triggerHaptic('medium');
                     onDoubleTap();
                 }
              }
              // Single tap or more handled elsewhere or ignored
              tapCountRef.current = 0;
          }, 400); 
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      const diffX = Math.abs(touch.clientX - touchStartRef.current.x);
      const diffY = Math.abs(touch.clientY - touchStartRef.current.y);

      // Cancel long press if moved significantly
      if (diffX > 10 || diffY > 10) {
          clearTimeout(longPressTimerRef.current);
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      clearTimeout(longPressTimerRef.current);
      if (!touchStartRef.current || isLongPressActiveRef.current) return;

      const touch = e.changedTouches[0];
      const diffX = touch.clientX - touchStartRef.current.x;
      const diffY = touch.clientY - touchStartRef.current.y;
      const timeDiff = Date.now() - touchStartRef.current.time;

      // Swipe Detection (Horizontal) 
      // STRICT CHECK: Horizontal distance must be > 50px, fast (<500ms), 
      // AND significantly larger than vertical distance (2x) to prevent triggers on scroll.
      if (Math.abs(diffX) > 50 && timeDiff < 500 && Math.abs(diffX) > Math.abs(diffY) * 2) {
          if (diffX > 0) {
              // Swipe Right -> Prev Page
              onPageChange(-1);
              announceStatus(`Page ${page!.pageNumber - 1}`, 'medium');
          } else {
              // Swipe Left -> Next Page
              onPageChange(1);
              announceStatus(`Page ${page!.pageNumber + 1}`, 'medium');
          }
      }
      
      touchStartRef.current = null;
  };

  const handleWhereAmI = () => {
      if (!page) return;
      
      let contextInfo = `You are on page ${page.pageNumber}. `;
      const firstLine = page.text.trim().split('\n')[0].substring(0, 50);
      contextInfo += `Section starting with: ${firstLine}...`;

      announceStatus(contextInfo, 'heavy');
  };

  const handleBookmarkGesture = (target: HTMLElement) => {
      if (!page) return;
      
      // Determine semantic context of the long-pressed element
      let text = target.innerText;
      let type: Bookmark['type'] = 'TEXT';

      // Traverse up to find semantic parent
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
      announceStatus("Bookmarked", 'success');
  };

  return (
    <div 
        ref={containerRef}
        className={clsx("h-full w-full overflow-y-auto relative outline-none touch-pan-y", THEME_CLASSES[settings.colorMode])}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
      {isProcessing ? (
         <div className="flex flex-col items-center justify-center h-full gap-4">
             <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
             <p className="text-lg font-medium animate-pulse">Analyzing structure...</p>
         </div>
      ) : (
         <div className="p-4 min-h-full pb-32 relative">
            
            {/* Semantic Layer (Accessible) */}
            <div 
                ref={semanticRef}
                tabIndex={0}
                className={clsx(
                    "semantic-content prose max-w-none focus:outline-none select-text mt-4",
                    settings.colorMode === ColorMode.HIGH_CONTRAST ? "high-contrast" : "dark:prose-invert",
                    // Hide if in original mode (visual only)
                    viewMode === 'original' && "sr-only"
                )}
                style={{ 
                    fontSize: `${settings.fontSize}rem`,
                    ...fontStyle // Apply Font Family here
                }}
                dangerouslySetInnerHTML={{ __html: page?.semanticHtml || `<p>${page?.text}</p>` }}
                aria-label={`Page ${page?.pageNumber} content`}
            />

            {/* Visual Layer Preview */}
            {viewMode === 'original' && (
               <div className="mt-4 flex justify-center">
                   <canvas ref={canvasRef} className="shadow-lg max-w-full" />
               </div>
            )}
         </div>
      )}
    </div>
  );
};
