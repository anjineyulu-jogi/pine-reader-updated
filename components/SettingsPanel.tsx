
import React, { useState } from 'react';
import { Sun, Moon, Eye, Type, Volume2, Mail, Send, Minus, Plus, Phone, Sparkles, Languages, BookOpen, GraduationCap, Coffee } from 'lucide-react';
import { AppSettings, ColorMode, ReadingLevel } from '../types';
import { Button } from './ui/Button';
import { AVAILABLE_VOICES, SUPPORTED_LANGUAGES } from '../constants';
import clsx from 'clsx';
import { PineappleLogo } from './ui/PineappleLogo';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdateSettings }) => {
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  
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
      <header className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
             <PineappleLogo className="w-10 h-10" />
        </div>
        <div>
            <h2 className={clsx("text-3xl font-extrabold", settings.colorMode === ColorMode.HIGH_CONTRAST ? "text-yellow-300" : "text-gray-900 dark:text-white")}>Settings</h2>
            <p className={clsx("text-sm font-medium opacity-70", settings.colorMode === ColorMode.HIGH_CONTRAST ? "text-yellow-100" : "text-gray-500 dark:text-gray-400")}>Customize your reading experience.</p>
        </div>
      </header>

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

      {/* Voice Settings */}
      <section className={clsx(sectionClass, sectionStyle)}>
           <h3 className="font-bold text-xl flex items-center gap-3">
              <Volume2 className="w-6 h-6 text-[#FFC107]" /> Voice Config
           </h3>
           <p className="text-sm opacity-70 font-medium">Select your preferred voice for reading.</p>

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

      {/* About Section */}
      <section className={clsx(sectionClass, sectionStyle)}>
           <div className="flex flex-col items-center text-center space-y-2 py-4">
              <PineappleLogo className="w-16 h-16 mb-2 text-yellow-500 drop-shadow-sm" />
              <h3 className="font-bold text-2xl">The Pineapple Company</h3>
              <p className="font-medium italic opacity-80 text-lg">The crown stays on. 🍍</p>
           </div>

           <div className="border-t border-b py-6 border-inherit border-opacity-20 space-y-6">
              <div className="text-center">
                  <h4 className="font-bold text-xl">Pine Reader</h4>
                  <p className="text-xs uppercase tracking-[0.2em] opacity-70 mt-1 font-semibold">Read the way you live.</p>
              </div>

              <div className="text-base leading-relaxed space-y-4 opacity-90 px-2 text-center sm:text-left">
                  <p>
                    Pine Reader is the first document reader built equally for blind and sighted users — with zero compromise.
                  </p>
                  <p>
                    Read any PDF, DOCX, XLSX, or text file exactly like Adobe Acrobat Reader mobile, while TalkBack reads real headings, tables, links, and images perfectly.
                  </p>
                  <p>
                    Powered by PineX — your personal assistant that reads the entire document and answers any question instantly.
                  </p>
              </div>
           </div>

           <div className="text-center space-y-1 py-2">
              <p className="font-medium">Made with ❤️ in India</p>
              <p className="opacity-70 text-sm">Version 2.0.0</p>
           </div>

           {/* Changelog */}
           <details className={clsx(
              "group p-4 rounded-xl border mt-4 cursor-pointer transition-all-300",
              settings.colorMode === ColorMode.HIGH_CONTRAST
                ? "border-yellow-300 bg-yellow-900/10" 
                : "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800"
           )}>
              <summary className="font-bold flex items-center gap-2 list-none select-none">
                 <Sparkles className="w-4 h-4 text-[#FFC107]" /> Launch Features v2.0
              </summary>
              <ul className="space-y-2 text-sm opacity-90 list-disc pl-4 mt-3">
                 <li><strong>Save as PDF:</strong> Export clean, accessible PDFs.</li>
                 <li><strong>Web Reader:</strong> Read any URL without clutter.</li>
                 <li><strong>Voice Commands:</strong> Control the app with your voice.</li>
                 <li><strong>Night Mode:</strong> Easy toggle in reader view.</li>
                 <li><strong>Smart Sharing:</strong> Share bookmarks and text easily.</li>
                 <li><strong>Adaptive Reading:</strong> Simplify text complexity on the fly.</li>
              </ul>
           </details>
      </section>
    </div>
  );
};
