
import React, { useEffect, useRef, useLayoutEffect } from 'react';
import { PageData, AppSettings, ColorMode } from '../types';
import clsx from 'clsx';
import { THEME_CLASSES } from '../constants';

interface ReaderProps {
  page: PageData | undefined;
  settings: AppSettings;
  isProcessing: boolean;
  initialScrollOffset?: number;
  onScroll?: (scrollTop: number) => void;
}

export const Reader: React.FC<ReaderProps> = ({
  page,
  settings,
  isProcessing,
  initialScrollOffset = 0,
  onScroll
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const scrollTimeoutRef = useRef<any>(null);

  // Restore scroll position when page changes or component mounts
  useLayoutEffect(() => {
    if (containerRef.current) {
        // Restore previous scroll position
        containerRef.current.scrollTop = initialScrollOffset;
        
        // Ensure focus for accessibility navigation
        // We use preventScroll: true because we just manually set scrollTop
        containerRef.current.focus({ preventScroll: true });
    }
  }, [page?.pageNumber, initialScrollOffset]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
      const target = e.currentTarget;
      
      // Debounce the scroll callback to prevent excessive state updates/storage writes
      if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
          if (onScroll) {
              onScroll(target.scrollTop);
          }
      }, 200);
  };

  if (!page) return null;

  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  // Page Container Style
  const pageContainerClass = clsx(
      "max-w-4xl mx-auto min-h-[60vh] p-6 md:p-12 shadow-sm mb-24 rounded-lg transition-colors border",
      isHighContrast 
        ? "bg-black text-yellow-300 border-4 border-yellow-300" 
        : "bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-800"
  );

  return (
    <main 
        ref={containerRef}
        onScroll={handleScroll}
        className={clsx(
            "flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth",
            THEME_CLASSES[settings.colorMode]
        )}
    >
        {/* Loading Indicator */}
        {isProcessing && (
            <div role="status" className="max-w-4xl mx-auto p-4 mb-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 flex items-center gap-3">
                <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                <span className="font-medium">Improving accessibility with AI...</span>
            </div>
        )}

        <article 
            className={pageContainerClass}
            style={{ 
                fontSize: `${settings.fontSize}rem`,
                lineHeight: 1.6 
            }}
            tabIndex={-1} 
            aria-label={`Page ${page.pageNumber} Content`}
        >
            {page.semanticHtml ? (
                <div 
                    className="semantic-content"
                    dangerouslySetInnerHTML={{ __html: page.semanticHtml }} 
                />
            ) : (
                <div className="whitespace-pre-wrap font-sans">
                    {page.text}
                </div>
            )}
        </article>
    </main>
  );
};
