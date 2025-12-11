
import React from 'react';
import { X, List, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
import clsx from 'clsx';
import { triggerHaptic } from '../services/hapticService';

interface OutlineViewProps {
  isOpen: boolean;
  onClose: () => void;
  outline: string[];
  onJumpToText: (text: string) => void;
  settings: AppSettings;
}

export const OutlineView: React.FC<OutlineViewProps> = ({
  isOpen,
  onClose,
  outline,
  onJumpToText,
  settings,
}) => {
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  if (!isOpen) return null;

  const handleJump = (text: string) => {
    triggerHaptic('medium');
    onJumpToText(text);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outline-title"
    >
      <div 
        className={clsx(
          "w-full max-w-lg max-h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border-2",
          isHighContrast 
            ? "bg-black border-yellow-300 text-yellow-300" 
            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        )}
      >
        <div className={clsx(
            "flex justify-between items-center p-4 border-b",
            isHighContrast ? "border-yellow-300" : "border-gray-100 dark:border-gray-800"
        )}>
          <h3 id="outline-title" className="text-xl font-bold flex items-center gap-2">
            <List className="w-6 h-6" /> Table of Contents
          </h3>
          <Button
            label="Close"
            variant="ghost"
            colorMode={settings.colorMode}
            onClick={onClose}
            icon={<X className="w-6 h-6" />}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {outline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-50">
               <p>No outline available.</p>
               <p className="text-sm mt-1">Try analyzing the document again.</p>
            </div>
          ) : (
            <div className="space-y-1">
               {outline.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleJump(item)}
                    className={clsx(
                        "w-full text-left p-4 rounded-lg flex items-start gap-3 transition-colors active:scale-[0.99]",
                        isHighContrast
                            ? "hover:bg-yellow-900/30 focus:bg-yellow-900/30"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800"
                    )}
                  >
                     <ChevronRight className={clsx("w-5 h-5 shrink-0 mt-0.5 opacity-50")} />
                     <span className="font-medium text-lg leading-snug">{item}</span>
                  </button>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
