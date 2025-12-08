
import React, { useState } from 'react';
import { Globe, Link as LinkIcon, Clipboard, ArrowRight, Layout, Type, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
import clsx from 'clsx';
import { PineappleLogo } from './ui/PineappleLogo';
import { triggerHaptic } from '../services/hapticService';

interface WebReaderViewProps {
  settings: AppSettings;
  onReadUrl: (url: string) => void;
}

export const WebReaderView: React.FC<WebReaderViewProps> = ({ settings, onReadUrl }) => {
  const [url, setUrl] = useState('');
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  const handlePaste = async () => {
      try {
          const text = await navigator.clipboard.readText();
          if (text) {
              setUrl(text);
              triggerHaptic('light');
          }
      } catch (e) {
          console.error("Clipboard access denied", e);
          alert("Could not access clipboard. Please paste manually.");
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (url.trim()) {
          onReadUrl(url.trim());
      }
  };

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-300 pb-24 overflow-y-auto bg-gray-50 dark:bg-black/50">
      {/* Hero Header */}
      <header className="pt-10 pb-6 px-6 text-center">
         <div className="inline-flex items-center justify-center p-4 rounded-full bg-white dark:bg-gray-800 shadow-md mb-4">
            <PineappleLogo className="w-16 h-16 drop-shadow-sm" />
         </div>
         <h2 className="text-4xl font-extrabold tracking-tight mb-2">Web Reader</h2>
         <p className="text-lg opacity-70 max-w-md mx-auto">
             Transform any web article into a clean, accessible reading experience.
         </p>
      </header>

      {/* Main Card */}
      <div className="max-w-xl mx-auto w-full px-6">
          <div className={clsx(
              "p-6 sm:p-8 rounded-2xl border transition-all shadow-xl",
              isHighContrast 
                ? "bg-black border-yellow-300 text-yellow-300"
                : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
          )}>
              <form onSubmit={handleSubmit} className="w-full space-y-6">
                  <div className="space-y-2 text-left">
                      <label htmlFor="url-input" className="text-sm font-bold uppercase tracking-wider opacity-60 ml-1">
                          Article URL
                      </label>
                      <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none opacity-50 group-focus-within:opacity-100 transition-opacity">
                              <Globe className="w-5 h-5" />
                          </div>
                          <input 
                              id="url-input"
                              type="url" 
                              placeholder="https://www.news.com/article..." 
                              value={url}
                              onChange={(e) => setUrl(e.target.value)}
                              required
                              className={clsx(
                                  "w-full pl-12 pr-12 py-4 rounded-xl border outline-none transition-all text-lg",
                                  isHighContrast 
                                    ? "bg-black border-2 border-yellow-300 text-yellow-300 placeholder-yellow-700 focus:ring-4 focus:ring-yellow-500/50"
                                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-black focus:border-[#FFC107] focus:ring-4 focus:ring-[#FFC107]/20"
                              )}
                          />
                          <button 
                              type="button"
                              onClick={handlePaste}
                              className="absolute inset-y-0 right-0 px-4 flex items-center opacity-50 hover:opacity-100 transition-opacity"
                              aria-label="Paste from Clipboard"
                              title="Paste"
                          >
                              <Clipboard className="w-5 h-5" />
                          </button>
                      </div>
                  </div>

                  <Button 
                      label="Read This Page" 
                      type="submit"
                      colorMode={settings.colorMode} 
                      className="w-full text-lg py-4 !bg-[#FFC107] hover:!bg-yellow-400 text-black border-none shadow-lg active:scale-[0.98] transition-all rounded-xl font-bold"
                      icon={<ArrowRight className="w-6 h-6" />}
                  />
              </form>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 opacity-80">
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-transparent dark:border-gray-700">
                  <Layout className="w-6 h-6 mb-2 text-[#FFC107]" />
                  <span className="font-bold text-sm">Clean Layout</span>
                  <span className="text-xs opacity-70">No ads or popups</span>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-transparent dark:border-gray-700">
                  <Type className="w-6 h-6 mb-2 text-[#FFC107]" />
                  <span className="font-bold text-sm">Accessible</span>
                  <span className="text-xs opacity-70">Real headings & tables</span>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-transparent dark:border-gray-700">
                  <ShieldCheck className="w-6 h-6 mb-2 text-[#FFC107]" />
                  <span className="font-bold text-sm">Private</span>
                  <span className="text-xs opacity-70">Read securely</span>
              </div>
          </div>
      </div>
    </div>
  );
};
