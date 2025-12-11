
import React, { useState, useEffect, useRef } from 'react';
import { X, Navigation } from 'lucide-react';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
import clsx from 'clsx';
import { THEME_CLASSES } from '../constants';

interface JumpToPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJump: (pageIndex: number) => void;
  currentPage: number;
  totalPages: number;
  settings: AppSettings;
}

export const JumpToPageModal: React.FC<JumpToPageModalProps> = ({
  isOpen,
  onClose,
  onJump,
  currentPage,
  totalPages,
  settings,
}) => {
  const [inputVal, setInputVal] = useState(String(currentPage + 1));
  const inputRef = useRef<HTMLInputElement>(null);
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  useEffect(() => {
    if (isOpen) {
      setInputVal(String(currentPage + 1));
      // Focus input after a short delay to ensure modal is rendered
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, currentPage]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(inputVal, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onJump(pageNum - 1); // Convert to 0-based index
      onClose();
    } else {
      // Simple feedback via focus or shake could be added here
      alert(`Please enter a number between 1 and ${totalPages}`);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="jump-title"
    >
      <div 
        className={clsx(
          "w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border-2",
          isHighContrast 
            ? "bg-black border-yellow-300 text-yellow-300" 
            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        )}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 id="jump-title" className="text-xl font-bold flex items-center gap-2">
            <Navigation className="w-6 h-6 text-[#FFC107]" /> Go to Page
          </h3>
          <Button
            label="Close"
            variant="ghost"
            colorMode={settings.colorMode}
            onClick={onClose}
            icon={<X className="w-6 h-6" />}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="page-input" className="block text-sm font-medium mb-2 opacity-90 text-center">
              Enter page number (1 - {totalPages})
            </label>
            <input
              ref={inputRef}
              id="page-input"
              type="number"
              min="1"
              max={totalPages}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className={clsx(
                "w-full text-center text-4xl font-extrabold py-4 rounded-xl border-2 outline-none focus:ring-4 transition-all-300",
                isHighContrast
                  ? "bg-black border-yellow-300 text-yellow-300 focus:ring-yellow-500/50"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-[#FFC107] focus:ring-[#FFC107]/20"
              )}
            />
          </div>

          <div className="flex gap-3">
            <Button
              label="Cancel"
              variant="secondary"
              colorMode={settings.colorMode}
              onClick={onClose}
              type="button"
              className="flex-1 py-4 text-lg rounded-xl"
            />
            <Button
              label="Go"
              variant="primary"
              colorMode={settings.colorMode}
              type="submit"
              className={clsx(
                  "flex-1 py-4 text-lg font-bold rounded-xl",
                  !isHighContrast && "!bg-[#FFC107] hover:!bg-yellow-400 !text-black"
              )}
            />
          </div>
        </form>
      </div>
    </div>
  );
};
