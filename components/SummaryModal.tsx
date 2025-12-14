
import React from 'react';
import { X, Sparkles, Loader2, Copy, Volume2, MessageSquareText } from 'lucide-react';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
import clsx from 'clsx';
import { triggerHaptic } from '../services/hapticService';
import { AIDisclaimer } from './AIDisclaimer';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryText: string | null;
  isLoading: boolean;
  settings: AppSettings;
  onReadAloud?: (text: string) => void; // New action
  onAskFollowUp?: () => void; // New action
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  summaryText,
  isLoading,
  settings,
  onReadAloud,
  onAskFollowUp
}) => {
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  if (!isOpen) return null;

  const handleCopy = () => {
      if (summaryText) {
          navigator.clipboard.writeText(summaryText);
          triggerHaptic('medium');
          alert("Summary copied!");
      }
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
      onClick={onClose}
    >
      <div 
        className={clsx(
          "w-full max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border-2 overflow-hidden",
          isHighContrast 
            ? "bg-black border-yellow-300 text-yellow-300" 
            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className={clsx(
            "flex justify-between items-center p-5 border-b shrink-0",
            isHighContrast ? "border-yellow-300 bg-black" : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50"
        )}>
          <h3 id="summary-title" className="text-xl font-bold flex items-center gap-2">
            <Sparkles className={clsx("w-6 h-6", isHighContrast ? "text-yellow-300" : "text-[#FFC107]")} /> 
            Document Summary
          </h3>
          <Button
            label="Close"
            variant="ghost"
            colorMode={settings.colorMode}
            onClick={onClose}
            icon={<X className="w-6 h-6" />}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-6 opacity-80">
               <Loader2 className={clsx("w-12 h-12 animate-spin", isHighContrast ? "text-yellow-300" : "text-[#FFC107]")} />
               <div className="text-center space-y-2">
                   <p className="font-bold text-lg">Generating Summary...</p>
                   <p className="text-sm opacity-70">Identifying key points and conclusions.</p>
               </div>
            </div>
          ) : (
            <div className="space-y-6">
               <div className={clsx(
                   "prose max-w-none text-lg leading-relaxed whitespace-pre-line",
                   isHighContrast ? "prose-invert" : "dark:prose-invert"
               )}>
                   {summaryText}
               </div>
               
               <AIDisclaimer colorMode={settings.colorMode} />
            </div>
          )}
        </div>

        {/* Action Footer */}
        {!isLoading && summaryText && (
            <div className={clsx(
                "p-4 border-t flex flex-col gap-3 shrink-0",
                isHighContrast ? "border-yellow-300 bg-black" : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
            )}>
                <div className="flex gap-3">
                    {onReadAloud && (
                        <Button 
                            label="Read Aloud"
                            variant="primary"
                            colorMode={settings.colorMode}
                            onClick={() => { triggerHaptic('medium'); onReadAloud(summaryText); }}
                            className="flex-1 font-bold"
                            icon={<Volume2 className="w-5 h-5" />}
                        >
                            Read Aloud
                        </Button>
                    )}
                    {onAskFollowUp && (
                        <Button 
                            label="Ask Pine-X"
                            variant="secondary"
                            colorMode={settings.colorMode}
                            onClick={() => { triggerHaptic('medium'); onAskFollowUp(); }}
                            className="flex-1 font-bold"
                            icon={<MessageSquareText className="w-5 h-5" />}
                        >
                            Ask Pine-X
                        </Button>
                    )}
                </div>
                <Button 
                    label="Copy Text"
                    variant="ghost"
                    colorMode={settings.colorMode}
                    onClick={handleCopy}
                    className="w-full text-sm font-medium"
                    icon={<Copy className="w-4 h-4" />}
                >
                    Copy Summary to Clipboard
                </Button>
            </div>
        )}
      </div>
    </div>
  );
};
