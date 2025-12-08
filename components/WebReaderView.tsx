
import React, { useState } from 'react';
import { Globe, Link as LinkIcon, Clipboard, ArrowRight } from 'lucide-react';
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
    <div className="flex-1 flex flex-col p-6 animate-in fade-in duration-300 pb-24 overflow-y-auto">
      <header className="mb-8 flex items-center gap-3">
        <PineappleLogo className="w-10 h-10" />
        <div>
            <h2 className="text-3xl font-bold flex items-center gap-2">
                Web Reader
            </h2>
            <p className="opacity-80 text-sm mt-1">Read any web article or story without ads.</p>
        </div>
      </header>

      <div className="max-w-xl mx-auto w-full space-y-8 mt-4">
          <div className={clsx(
              "p-8 rounded-xl border flex flex-col gap-6 text-center transition-colors",
              isHighContrast 
                ? "bg-black border-yellow-300 text-yellow-300"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
          )}>
              <div className={clsx(
                  "mx-auto p-4 rounded-full",
                  isHighContrast ? "bg-yellow-300 text-black" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              )}>
                  <Globe className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                  <h3 className="text-xl font-bold">Enter Web Address</h3>
                  <p className="opacity-70 text-sm">Paste a URL to generate an accessible reader view.</p>
              </div>

              <form onSubmit={handleSubmit} className="w-full space-y-4">
                  <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none opacity-50">
                          <LinkIcon className="w-5 h-5" />
                      </div>
                      <input 
                          type="url" 
                          placeholder="https://example.com/story..." 
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          required
                          className={clsx(
                              "w-full pl-10 pr-12 py-3 rounded-lg border outline-none focus:ring-2",
                              isHighContrast 
                                ? "bg-black border-yellow-300 text-yellow-300 placeholder-yellow-700 focus:ring-yellow-500"
                                : "bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                          )}
                      />
                      <button 
                          type="button"
                          onClick={handlePaste}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center opacity-70 hover:opacity-100"
                          aria-label="Paste from Clipboard"
                      >
                          <Clipboard className="w-5 h-5" />
                      </button>
                  </div>

                  <Button 
                      label="Read This Page" 
                      type="submit"
                      colorMode={settings.colorMode} 
                      className="w-full text-lg py-3 !bg-[#FFC107] hover:!bg-yellow-400 text-black border-none shadow-md"
                      icon={<ArrowRight className="w-5 h-5" />}
                  />
              </form>
          </div>

          <div className="text-center opacity-60 text-sm">
              <p>Powered by PineX. Works on news, blogs, and text-heavy sites.</p>
          </div>
      </div>
    </div>
  );
};
