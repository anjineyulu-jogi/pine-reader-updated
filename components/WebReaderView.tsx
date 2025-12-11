
import React, { useState } from 'react';
import { Globe, Clipboard, ArrowRight, Loader2, AlertCircle, Link2, Layout, Type } from 'lucide-react';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
import clsx from 'clsx';
import { triggerHaptic } from '../services/hapticService';
import { playCompletionSound } from '../services/audioService';

interface WebReaderViewProps {
  settings: AppSettings;
  onReadUrl: (url: string) => Promise<void>;
}

export const WebReaderView: React.FC<WebReaderViewProps> = ({ settings, onReadUrl }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        setError(null);
        triggerHaptic('light');
      }
    } catch (e) {
      console.error("Clipboard access denied", e);
      setError("Clipboard access denied. Please paste manually.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
        setError("Please enter a valid URL.");
        return;
    }

    // Basic URL validation
    if (!url.startsWith('http')) {
        setError("URL must start with http:// or https://");
        return;
    }

    setError(null);
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      await onReadUrl(url.trim());
      // On success
      triggerHaptic('success');
      playCompletionSound();
    } catch (err) {
      setError("Failed to load page. Please check the URL.");
      setIsLoading(false); 
      triggerHaptic('error');
    }
  };

  return (
    <div className={clsx(
        "flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300 overflow-y-auto pb-32",
        isHighContrast ? "bg-black" : "bg-gray-50 dark:bg-black"
    )}>
      
      {/* Central Content Container */}
      <div className="w-full max-w-lg flex flex-col items-center text-center space-y-8">
        
        {/* Hero Icon */}
        <div className="relative">
            <div className={clsx(
                "absolute inset-0 rounded-full blur-2xl opacity-20",
                isHighContrast ? "bg-yellow-300" : "bg-[#FFC107]"
            )} />
            <Globe className={clsx(
                "w-20 h-20 relative z-10 drop-shadow-xl",
                isHighContrast ? "text-yellow-300" : "text-[#FFC107]"
            )} />
        </div>

        {/* Text */}
        <div className="space-y-2">
            <h2 className={clsx(
                "text-3xl font-extrabold tracking-tight",
                isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white"
            )}>
                Web Reader
            </h2>
            <p className={clsx(
                "text-lg font-medium max-w-xs mx-auto",
                isHighContrast ? "text-yellow-100/80" : "text-gray-500 dark:text-gray-400"
            )}>
                Instantly convert any article or story into an accessible reading format.
            </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-6 relative">
            
            {/* Error Message */}
            {error && (
                <div className={clsx(
                    "absolute -top-14 left-0 right-0 p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold animate-in slide-in-from-top-2",
                    isHighContrast ? "bg-red-900 text-yellow-300 border border-yellow-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200"
                )}>
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Input Group */}
            <div className="relative group">
                <div className={clsx(
                    "absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors",
                    isHighContrast ? "text-yellow-300/50" : "text-gray-400"
                )}>
                    <Link2 className="w-6 h-6" />
                </div>
                <input 
                    type="url" 
                    placeholder="Paste article link..." 
                    value={url}
                    onChange={(e) => {
                        setUrl(e.target.value);
                        if (error) setError(null);
                    }}
                    disabled={isLoading}
                    className={clsx(
                        "w-full pl-14 pr-14 py-5 rounded-[2rem] text-lg font-medium outline-none transition-all shadow-sm",
                        isHighContrast 
                            ? "bg-black border-2 border-yellow-300 text-yellow-300 placeholder-yellow-700 focus:ring-4 focus:ring-yellow-500/50"
                            : "bg-white dark:bg-gray-900 border-2 border-transparent focus:border-[#FFC107] text-gray-900 dark:text-white placeholder-gray-400 focus:shadow-lg focus:ring-4 focus:ring-[#FFC107]/10"
                    )}
                />
                
                {/* Paste Button (Inside Input) */}
                {!isLoading && !url && (
                    <button 
                        type="button"
                        onClick={handlePaste}
                        className={clsx(
                            "absolute inset-y-2 right-2 px-4 rounded-xl flex items-center gap-2 text-sm font-bold transition-all",
                            isHighContrast 
                                ? "bg-yellow-300 text-black hover:bg-yellow-400" 
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        )}
                    >
                        <Clipboard className="w-4 h-4" />
                        PASTE
                    </button>
                )}
            </div>

            {/* Action Button */}
            <Button 
                label={isLoading ? "Analyzing..." : "Read Article"}
                type="submit"
                disabled={isLoading}
                colorMode={settings.colorMode} 
                className={clsx(
                    "w-full py-5 text-xl font-bold rounded-[2rem] shadow-xl transition-transform active:scale-[0.98]",
                    isHighContrast
                        ? "!bg-yellow-300 !text-black !border-4 !border-white hover:!bg-yellow-400"
                        : "!bg-[#FFC107] hover:!bg-[#ffca2c] !text-black"
                )}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Analyzing Page...</span>
                    </>
                ) : (
                    <>
                        <span>Read Article</span>
                        <ArrowRight className="w-6 h-6" />
                    </>
                )}
            </Button>
        </form>

        {/* Footer Hints */}
        <div className="grid grid-cols-3 gap-4 w-full pt-8 opacity-60">
             <div className="flex flex-col items-center gap-2">
                 <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                     <Layout className="w-5 h-5" />
                 </div>
                 <span className="text-xs font-bold uppercase tracking-wider">No Ads</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                 <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                     <Type className="w-5 h-5" />
                 </div>
                 <span className="text-xs font-bold uppercase tracking-wider">Clear Text</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                 <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                     <Globe className="w-5 h-5" />
                 </div>
                 <span className="text-xs font-bold uppercase tracking-wider">Translate</span>
             </div>
        </div>

      </div>
    </div>
  );
};
