
import React, { useState } from 'react';
import { Sun, Moon, Eye, Type, Volume2, Mail, Send, Minus, Plus, Phone, Sparkles, Languages, BookOpen, GraduationCap, Coffee, Users, Globe, ArrowLeft, FastForward, FileText, Rss, Info } from 'lucide-react';
import { AppSettings, ColorMode, ReadingLevel } from '../types';
import { Button } from './ui/Button';
import { AVAILABLE_VOICES, SUPPORTED_LANGUAGES } from '../constants';
import clsx from 'clsx';
import { PineappleLogo } from './ui/PineappleLogo';
import { LegalView } from './LegalView';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onBack?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdateSettings, onBack }) => {
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [showLegalOverlay, setShowLegalOverlay] = useState<'Privacy' | 'T&C' | null>(null);
  
  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const handleFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Pine-reader Feedback: ${feedbackSubject}`);
    const body = encodeURIComponent(
`User Email: ${feedbackEmail}

Subject: ${feedbackSubject}

Message:
${feedbackMsg}

--------------------------------
Sent via Pine-reader App`
    );
    window.location.href = `mailto:hello.jogi@proton.me?subject=${subject}&body=${body}`;
  };

  const sectionClass = "p-6 rounded-2xl border transition-all-300 space-y-5";
  const sectionStyle = settings.colorMode === ColorMode.HIGH_CONTRAST
    ? "border-yellow-300 bg-black text-yellow-300"
    : "border-gray-100 dark:border-gray-800 bg-white dark:bg-[#151515] shadow-sm hover:shadow-md";

  return (
    <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-6 max-w-2xl mx-auto w-full animate-in fade-in duration-300 bg-gray-50 dark:bg-black">
      
      {/* NEW HEADER: Conditionally render if onBack is provided */}
        {onBack && (
            <div className={clsx(
                "flex items-center p-4 border-b shrink-0 -mx-6 -mt-6 mb-6", 
                settings.colorMode === ColorMode.HIGH_CONTRAST ? "border-yellow-300 bg-black" : "border-gray-200 dark:border-gray-800 dark:bg-gray-900"
            )}>
                <Button
                    label="Back to Documents"
                    variant="ghost"
                    onClick={onBack}
                    colorMode={settings.colorMode}
                    className="p-1 -ml-2"
                    icon={<ArrowLeft className="w-6 h-6" />}
                />
                <h1 className={clsx("text-xl font-bold flex-1 text-center pr-8", settings.colorMode === ColorMode.HIGH_CONTRAST ? "text-yellow-300" : "text-gray-900 dark:text-white")}>Settings</h1> 
            </div>
        )}

      {!onBack && (
        <header className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                <PineappleLogo className="w-10 h-10" />
            </div>
            <div>
                <h2 className={clsx("text-3xl font-extrabold", settings.colorMode === ColorMode.HIGH_CONTRAST ? "text-yellow-300" : "text-gray-900 dark:text-white")}>Settings</h2>
                <p className={clsx("text-sm font-medium opacity-70", settings.colorMode === ColorMode.HIGH_CONTRAST ? "text-yellow-100" : "text-gray-500 dark:text-gray-400")}>Customize your reading experience.</p>
            </div>
        </header>
      )}

      {/* Color Mode */}
      <section className={clsx(sectionClass, sectionStyle)}>
          <h3 className="font-bold text-xl flex items-center gap-3">
              <Eye className="w-6 h-6 text-[#FFC107]" /> Display Theme
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                  aria-pressed={settings.colorMode === ColorMode.LIGHT}
                  onClick={() => handleChange('colorMode', ColorMode.LIGHT)}
                  className={clsx(
                      "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all-300 active:scale-95",
                      settings.colorMode === ColorMode.LIGHT 
                        ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-200" 
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
              >
                  <Sun className="w-6 h-6" />
                  <span className="font-bold">Light</span>
              </button>
              <button
                  aria-pressed={settings.colorMode === ColorMode.DARK}
                  onClick={() => handleChange('colorMode', ColorMode.DARK)}
                  className={clsx(
                      "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all-300 active:scale-95",
                      settings.colorMode === ColorMode.DARK 
                        ? "border-blue-500 bg-gray-900 text-white ring-2 ring-blue-900" 
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
              >
                  <Moon className="w-6 h-6" />
                  <span className="font-bold">Dark</span>
              </button>
              <button
                  aria-pressed={settings.colorMode === ColorMode.HIGH_CONTRAST}
                  onClick={() => handleChange('colorMode', ColorMode.HIGH_CONTRAST)}
                  className={clsx(
                      "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all-300 active:scale-95",
                      settings.colorMode === ColorMode.HIGH_CONTRAST 
                        ? "border-yellow-300 bg-black text-yellow-300 ring-2 ring-yellow-600" 
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
              >
                  <Eye className="w-6 h-6" />
                  <span className="font-bold">Contrast</span>
              </button>
          </div>
      </section>

      {/* Font Size */}
      <section className={clsx(sectionClass, sectionStyle)}>
          <div className="flex items-center justify-between mb-2">
             <h3 className="font-bold text-xl flex items-center gap-3">
                <Type className="w-6 h-6 text-[#FFC107]" /> Text Size
             </h3>
             <span className="text-sm font-bold opacity-70 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{settings.fontSize.toFixed(1)}x</span>
          </div>
          
          <div className="flex items-center gap-4">
              <Button 
                  colorMode={settings.colorMode} 
                  label="Decrease" 
                  variant="secondary"
                  onClick={() => handleChange('fontSize', Math.max(0.8, settings.fontSize - 0.2))}
                  className="w-12 h-12 flex items-center justify-center rounded-xl"
              >
                <Minus className="w-6 h-6" />
              </Button>
              <input 
                  type="range" 
                  min="0.8" 
                  max="3.0" 
                  step="0.1" 
                  value={settings.fontSize}
                  onChange={(e) => handleChange('fontSize', parseFloat(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-[#FFC107]"
                  aria-label="Font Size Slider"
              />
              <Button 
                  colorMode={settings.colorMode} 
                  label="Increase" 
                  variant="secondary"
                  onClick={() => handleChange('fontSize', Math.min(3.0, settings.fontSize + 0.2))}
                  className="w-12 h-12 flex items-center justify-center rounded-xl"
              >
                <Plus className="w-6 h-6" />
              </Button>
          </div>
      </section>

      {/* Reading Level */}
      <section className={clsx(sectionClass, sectionStyle)}>
          <h3 className="font-bold text-xl flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-[#FFC107]" /> Reading Level
          </h3>
          <p className="text-sm opacity-70 font-medium">Adapt the document text difficulty.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                  aria-pressed={settings.readingLevel === ReadingLevel.SIMPLIFIED}
                  onClick={() => handleChange('readingLevel', ReadingLevel.SIMPLIFIED)}
                  className={clsx(
                      "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all-300 active:scale-95",
                      settings.readingLevel === ReadingLevel.SIMPLIFIED 
                        ? (settings.colorMode === ColorMode.HIGH_CONTRAST 
                            ? "border-yellow-300 bg-yellow-900 text-yellow-300"
                            : "border-green-500 bg-green-50 text-green-900 ring-2 ring-green-200")
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
              >
                  <Coffee className="w-6 h-6" />
                  <span className="font-bold">Simple</span>
              </button>
              <button
                  aria-pressed={settings.readingLevel === ReadingLevel.NORMAL}
                  onClick={() => handleChange('readingLevel', ReadingLevel.NORMAL)}
                  className={clsx(
                      "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all-300 active:scale-95",
                      settings.readingLevel === ReadingLevel.NORMAL
                        ? (settings.colorMode === ColorMode.HIGH_CONTRAST
                            ? "border-yellow-300 bg-yellow-900 text-yellow-300"
                            : "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200")
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
              >
                  <BookOpen className="w-6 h-6" />
                  <span className="font-bold">Normal</span>
              </button>
              <button
                  aria-pressed={settings.readingLevel === ReadingLevel.ACADEMIC}
                  onClick={() => handleChange('readingLevel', ReadingLevel.ACADEMIC)}
                  className={clsx(
                      "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all-300 active:scale-95",
                      settings.readingLevel === ReadingLevel.ACADEMIC
                        ? (settings.colorMode === ColorMode.HIGH_CONTRAST
                            ? "border-yellow-300 bg-yellow-900 text-yellow-300"
                            : "border-purple-500 bg-purple-50 text-purple-900 ring-2 ring-purple-200")
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
              >
                  <GraduationCap className="w-6 h-6" />
                  <span className="font-bold">Academic</span>
              </button>
          </div>
      </section>

      {/* Language Settings */}
      <section className={clsx(sectionClass, sectionStyle)}>
           <h3 className="font-bold text-xl flex items-center gap-3">
              <Languages className="w-6 h-6 text-[#FFC107]" /> Language
           </h3>
           <p className="text-sm opacity-70 font-medium">Select app and reading language.</p>

           <div className="relative">
              <select
                id="language-select"
                value={settings.language || 'en'}
                onChange={(e) => handleChange('language', e.target.value)}
                className={clsx(
                  "w-full p-4 rounded-xl border appearance-none text-lg font-medium outline-none focus:ring-2 transition-shadow",
                  settings.colorMode === ColorMode.HIGH_CONTRAST 
                    ? "bg-black border-yellow-300 text-yellow-300 focus:ring-yellow-500"
                    : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-[#FFC107] focus:ring-[#FFC107]/20"
                )}
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
           </div>
      </section>

      {/* Audio Settings */}
      <section className={clsx(sectionClass, sectionStyle)}>
           <h3 className="font-bold text-xl flex items-center gap-3">
              <Volume2 className="w-6 h-6 text-[#FFC107]" /> Audio Configuration
           </h3>
           
           <div className="space-y-4">
               <div>
                   <p className="text-sm opacity-70 font-medium mb-2">Voice Selection</p>
                   <div className="relative">
                      <select
                        id="voice-select"
                        value={settings.voiceName || 'Kore'}
                        onChange={(e) => handleChange('voiceName', e.target.value)}
                        className={clsx(
                          "w-full p-4 rounded-xl border appearance-none text-lg font-medium outline-none focus:ring-2 transition-shadow",
                          settings.colorMode === ColorMode.HIGH_CONTRAST 
                            ? "bg-black border-yellow-300 text-yellow-300 focus:ring-yellow-500"
                            : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-[#FFC107] focus:ring-[#FFC107]/20"
                        )}
                      >
                        {AVAILABLE_VOICES.map(voice => (
                          <option key={voice.id} value={voice.id}>{voice.name}</option>
                        ))}
                      </select>
                   </div>
               </div>

               <div>
                   <p className="text-sm opacity-70 font-medium mb-2 flex items-center gap-2">
                       <FastForward className="w-4 h-4" /> Seek Interval
                   </p>
                   <div className="grid grid-cols-3 gap-3">
                        {[10, 30, 60].map(seconds => (
                            <button
                                key={seconds}
                                aria-pressed={settings.seekDuration === seconds}
                                onClick={() => handleChange('seekDuration', seconds)}
                                className={clsx(
                                    "p-3 rounded-xl border-2 font-bold text-center transition-all",
                                    settings.seekDuration === seconds
                                        ? (settings.colorMode === ColorMode.HIGH_CONTRAST 
                                            ? "bg-yellow-300 text-black border-white" 
                                            : "bg-[#FFC107] text-black border-[#FFC107]")
                                        : "bg-transparent border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-white/5"
                                )}
                            >
                                {seconds}s
                            </button>
                        ))}
                   </div>
               </div>
           </div>
      </section>

      {/* Feedback Section */}
      <section className={clsx(sectionClass, sectionStyle)}>
           <h3 className="font-bold text-xl flex items-center gap-3">
              <Mail className="w-6 h-6 text-[#FFC107]" /> Send Feedback
           </h3>
           
           <form onSubmit={handleFeedback} className="space-y-4">
              <Button 
                  colorMode={settings.colorMode} 
                  label="Send Feedback via Email" 
                  type="submit"
                  className="w-full py-4 text-lg"
                  icon={<Send className="w-5 h-5" />}
              />
           </form>
      </section>

      {/* Contact Us Section */}
      <section className={clsx(sectionClass, 
        settings.colorMode === ColorMode.HIGH_CONTRAST 
          ? "border-yellow-300 bg-yellow-900/10" 
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      )}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" /> Contact Us
          </h2>

          <div className="space-y-3">
              <p className="font-semibold text-lg">The Pineapple Company</p>
              
              <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 opacity-70" />
                  <a 
                      href="mailto:hello.jogi@the-pineapple.net" 
                      className={clsx("underline hover:opacity-90", settings.colorMode === ColorMode.HIGH_CONTRAST ? "text-yellow-300" : "text-blue-500")}
                      aria-label="E-mail Us"
                  >
                      E-mail Us
                  </a>
              </div>

              <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 opacity-70" />
                  <a 
                      href="https://www.the-pineapple.net" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={clsx("underline hover:opacity-90", settings.colorMode === ColorMode.HIGH_CONTRAST ? "text-yellow-300" : "text-blue-500")}
                      aria-label="Visit Our Website"
                  >
                      Visit Our Website
                  </a>
              </div>
          </div>
      </section>

      {/* About Pine Reader (Legal & Updates) */}
      <section className={clsx(sectionClass, sectionStyle)}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Info className="w-6 h-6 text-[#FFC107]" /> About Pine Reader
          </h2>
          
          <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-inherit border-opacity-20">
                  <span className="font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 opacity-70" /> Legal
                  </span>
                  <div className="flex gap-4">
                      <button 
                          onClick={() => setShowLegalOverlay('Privacy')} 
                          className={clsx("text-sm hover:underline font-medium", settings.colorMode === ColorMode.HIGH_CONTRAST ? "text-yellow-300" : "text-blue-600 dark:text-blue-400")}
                      >
                          Privacy Policy
                      </button>
                      <button 
                          onClick={() => setShowLegalOverlay('T&C')} 
                          className={clsx("text-sm hover:underline font-medium", settings.colorMode === ColorMode.HIGH_CONTRAST ? "text-yellow-300" : "text-blue-600 dark:text-blue-400")}
                      >
                          T&amp;C
                      </button>
                  </div>
              </div>

              <div className="flex justify-between items-center py-2">
                  <span className="font-medium flex items-center gap-2">
                      <Rss className="w-4 h-4 opacity-70" /> Updates
                  </span>
                  <a 
                      href="https://www.the-pineapple.net" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={clsx("text-sm hover:underline font-medium", settings.colorMode === ColorMode.HIGH_CONTRAST ? "text-yellow-300" : "text-blue-600 dark:text-blue-400")}
                  >
                      Visit Website
                  </a>
              </div>
          </div>
      </section>

      {/* Version & Info Section */}
      <section className={clsx(sectionClass, 
        settings.colorMode === ColorMode.HIGH_CONTRAST 
          ? "border-yellow-300 bg-black text-yellow-300" 
          : "bg-transparent border-transparent shadow-none"
      )}>
           <div className="flex flex-col items-center text-center space-y-2 py-4">
              <PineappleLogo className="w-16 h-16 mb-2 text-yellow-500 drop-shadow-sm" />
              <h3 className="font-bold text-2xl">The Pineapple Company</h3>
              <p className="font-medium italic opacity-80 text-lg">The crown stays on. 🍍</p>
           </div>

           <div className="border-t border-b py-6 border-gray-200 dark:border-gray-700 space-y-6">
              <div className="text-center">
                  <h4 className="font-bold text-xl">Pine Reader</h4>
                  <p className="text-xs uppercase tracking-[0.2em] opacity-70 mt-1 font-semibold">Read the way you live.</p>
              </div>

              {/* APPLICATION DESCRIPTION */}
              <div className="text-base leading-relaxed space-y-4 opacity-90 px-2 text-center sm:text-left">
                  <p>
                    Pine Reader is the first document reader built for **uncompromised accessibility**,
                    providing a seamless experience for both blind and sighted users. Read any PDF,
                    DOCX, or TXT file with crystal-clear visual layout, while native screen readers
                    (like TalkBack) announce headings, tables, links, and images perfectly.
                  </p>
                  <p>
                    Powered by Pine-X — your personal AI assistant that provides instant answers and document insights.
                  </p>
              </div>
           </div>

           <div className="text-center space-y-1 py-2">
              <p className="font-medium">Made with ❤️ in India</p>
              <p className="opacity-70 text-sm">Version 2.5.0</p>
           </div>

           {/* Changelog - Features List */}
           <details className={clsx(
              "group p-4 rounded-xl border mt-4 cursor-pointer transition-all-300",
              settings.colorMode === ColorMode.HIGH_CONTRAST
                ? "border-yellow-300 bg-yellow-900/10" 
                : "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800"
           )}>
              <summary className="font-bold flex items-center gap-2 list-none select-none">
                 <Sparkles className="w-4 h-4 text-[#FFC107]" /> Launch Features v2.5
              </summary>
              <ul className="space-y-2 text-sm opacity-90 list-disc pl-4 mt-3">
                 <li><strong>AI Insights & Summary:</strong> One-tap summary and keyword extraction powered by Pine-X.</li>
                 <li><strong>Accessible Table Reading:</strong> Tables are read aloud with full column header context for screen readers.</li>
                 <li><strong>Seamless Loading:</strong> Progressive loading and caching for instant document access.</li>
                 <li><strong>Enhanced UI:</strong> Mobile-native control bars for intuitive, bottom-fixed navigation and audio controls.</li>
                 <li><strong>Voice Control Confirmation:</strong> Auditory feedback for all Pine-X commands ("Go to page 5").</li>
                 <li><strong>Web Reader & PDF Export:</strong> Read any URL without clutter and export clean, accessible PDFs.</li>
              </ul>
           </details>
      </section>

      {/* Legal Overlay Modal */}
      {showLegalOverlay && (
          <LegalView 
              documentType={showLegalOverlay}
              onClose={() => setShowLegalOverlay(null)}
          />
      )}
    </div>
  );
};
