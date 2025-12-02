import React, { useEffect, useRef } from 'react';
import { PageData, AppSettings, ColorMode } from '../types';
import clsx from 'clsx';
import { THEME_CLASSES } from '../constants';

interface ReaderProps {
  page: PageData | undefined;
  settings: AppSettings;
  isProcessing: boolean;
}

export const Reader: React.FC<ReaderProps> = ({
  page,
  settings,
  isProcessing
}) => {
  const containerRef = useRef<HTMLElement>(null);

  // Auto focus content on page change for Screen Readers
  useEffect(() => {
    if (containerRef.current) {
        containerRef.current.focus();
    }
  }, [page]);

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
            ref={containerRef}
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