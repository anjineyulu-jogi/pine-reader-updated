
import React from 'react';
import { X, Sparkles, Loader2, Copy } from 'lucide-react';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
import clsx from 'clsx';
import { triggerHaptic } from '../services/hapticService';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryText: string | null;
  isLoading: boolean;
  settings: AppSettings;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  summaryText,
  isLoading,
  settings,
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
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
      onClick={onClose}
    >
      <div 
        className={clsx(
          "w-full max-w-lg max-h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border-2",
          isHighContrast 
            ? "bg-black border-yellow-300 text-yellow-300" 
            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className={clsx(
            "flex justify-between items-center p-4 border-b shrink-0",
            isHighContrast ? "border-yellow-300" : "border-gray-100 dark:border-gray-800"
        )}>
          <h3 id="summary-title" className="text-xl font-bold flex items-center gap-2">
            <Sparkles className={clsx("w-6 h-6", isHighContrast ? "text-yellow-300" : "text-[#FFC107]")} /> 
            Smart Summary
          </h3>
          <Button
            label="Close"
            variant="ghost"
            colorMode={settings.colorMode}
            onClick={onClose}
            icon={<X className="w-6 h-6" />}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
               <Loader2 className={clsx("w-10 h-10 animate-spin", isHighContrast ? "text-yellow-300" : "text-[#FFC107]")} />
               <p className="font-medium animate-pulse">Generating concise summary...</p>
            </div>
          ) : (
            <div className="space-y-4">
               <div className={clsx(
                   "prose max-w-none text-lg leading-relaxed whitespace-pre-line",
                   isHighContrast ? "prose-invert" : "dark:prose-invert"
               )}>
                   {summaryText}
               </div>
               
               <div className="pt-4 flex justify-end">
                  <Button 
                      label="Copy Summary"
                      variant="secondary"
                      colorMode={settings.colorMode}
                      onClick={handleCopy}
                      icon={<Copy className="w-4 h-4" />}
                      className="text-sm"
                  />
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
