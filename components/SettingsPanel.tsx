import React, { useState } from 'react';
import { Sun, Moon, Eye, Type, Volume2, Mail, Send, Minus, Plus } from 'lucide-react';
import { AppSettings, ColorMode } from '../types';
import { Button } from './ui/Button';
import clsx from 'clsx';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  // No longer needs onClose as it's a tab
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdateSettings }) => {
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  
  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const handleFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent("Feedback for Pine-reader");
    const body = encodeURIComponent(`Message:\n${feedbackMsg}\n\nContact Email: ${feedbackEmail}`);
    window.location.href = `mailto:hello.jogi@proton.me?subject=${subject}&body=${body}`;
  };

  const sectionClass = "p-6 rounded-xl border transition-colors space-y-4";
  const sectionStyle = settings.colorMode === ColorMode.HIGH_CONTRAST
    ? "border-yellow-300 bg-black text-yellow-300"
    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm";

  return (
    <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-6 max-w-2xl mx-auto w-full animate-in fade-in duration-300">
      <header>
        <h2 className="text-3xl font-bold mb-2">Settings</h2>
        <p className="opacity-80">Customize your reading experience.</p>
      </header>

      {/* Color Mode */}
      <section className={clsx(sectionClass, sectionStyle)}>
          <h3 className="font-bold text-xl flex items-center gap-2">
              <Eye className="w-6 h-6" /> Display Theme
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                  aria-pressed={settings.colorMode === ColorMode.LIGHT}
                  onClick={() => handleChange('colorMode', ColorMode.LIGHT)}
                  className={clsx(
                      "p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all",
                      settings.colorMode === ColorMode.LIGHT 
                        ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-200" 
                        : "border-gray-200 dark:border-gray-600 hover:bg-gray-50"
                  )}
              >
                  <Sun className="w-6 h-6" />
                  <span className="font-bold">Light</span>
              </button>
              <button
                  aria-pressed={settings.colorMode === ColorMode.DARK}
                  onClick={() => handleChange('colorMode', ColorMode.DARK)}
                  className={clsx(
                      "p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all",
                      settings.colorMode === ColorMode.DARK 
                        ? "border-blue-500 bg-gray-900 text-white ring-2 ring-blue-900" 
                        : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  )}
              >
                  <Moon className="w-6 h-6" />
                  <span className="font-bold">Dark</span>
              </button>
              <button
                  aria-pressed={settings.colorMode === ColorMode.HIGH_CONTRAST}
                  onClick={() => handleChange('colorMode', ColorMode.HIGH_CONTRAST)}
                  className={clsx(
                      "p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all",
                      settings.colorMode === ColorMode.HIGH_CONTRAST 
                        ? "border-yellow-300 bg-black text-yellow-300 ring-2 ring-yellow-600" 
                        : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
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
             <h3 className="font-bold text-xl flex items-center gap-2">
                <Type className="w-6 h-6" /> Text Size
             </h3>
             <span className="text-sm opacity-70">{settings.fontSize.toFixed(1)}x</span>
          </div>
          
          <div className="flex items-center gap-4">
              <Button 
                  colorMode={settings.colorMode} 
                  label="Decrease" 
                  variant="secondary"
                  onClick={() => handleChange('fontSize', Math.max(0.8, settings.fontSize - 0.2))}
                  className="w-12 h-12 flex items-center justify-center"
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
                  className="flex-1 h-4 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-blue-600"
                  aria-label="Font Size Slider"
              />
              <Button 
                  colorMode={settings.colorMode} 
                  label="Increase" 
                  variant="secondary"
                  onClick={() => handleChange('fontSize', Math.min(3.0, settings.fontSize + 0.2))}
                  className="w-12 h-12 flex items-center justify-center"
              >
                <Plus className="w-6 h-6" />
              </Button>
          </div>
          <p className="text-lg mt-4 p-4 border rounded bg-opacity-10 bg-gray-500" style={{ fontSize: `${settings.fontSize}rem` }}>
             Preview text size.
          </p>
      </section>

      {/* Voice Settings */}
      <section className={clsx(sectionClass, sectionStyle)}>
           <h3 className="font-bold text-xl flex items-center gap-2">
              <Volume2 className="w-6 h-6" /> Text-to-Speech Config
           </h3>
           <p className="text-sm opacity-70 mb-4">Adjusts styling for future read-aloud features.</p>

           <div className="space-y-4">
               <div>
                  <label className="block font-medium mb-2">Speed ({settings.speechRate.toFixed(1)}x)</label>
                  <input 
                      type="range" 
                      min="0.5" 
                      max="2.0" 
                      step="0.1" 
                      value={settings.speechRate}
                      onChange={(e) => handleChange('speechRate', parseFloat(e.target.value))}
                      className="w-full h-4 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-blue-600"
                  />
               </div>
               <div>
                  <label className="block font-medium mb-2">Pitch ({settings.pitch.toFixed(1)})</label>
                  <input 
                      type="range" 
                      min="0.5" 
                      max="1.5" 
                      step="0.1" 
                      value={settings.pitch}
                      onChange={(e) => handleChange('pitch', parseFloat(e.target.value))}
                      className="w-full h-4 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-blue-600"
                  />
               </div>
           </div>
      </section>

      {/* Feedback Section */}
      <section className={clsx(sectionClass, sectionStyle)}>
           <h3 className="font-bold text-xl flex items-center gap-2">
              <Mail className="w-6 h-6" /> Feedback & Support
           </h3>
           <p className="text-sm opacity-70 mb-4">Report bugs or send suggestions to the developer.</p>
           
           <form onSubmit={handleFeedback} className="space-y-4">
              <div>
                  <label htmlFor="email" className="block font-medium mb-1">Your Email</label>
                  <input 
                      id="email"
                      type="email" 
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={clsx(
                          "w-full p-3 rounded-lg border",
                          settings.colorMode === ColorMode.HIGH_CONTRAST 
                            ? "bg-black border-yellow-300 text-yellow-300 placeholder-yellow-700"
                            : "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                      )}
                      required
                  />
              </div>
              
              <div>
                  <label htmlFor="message" className="block font-medium mb-1">Message</label>
                  <textarea 
                      id="message"
                      value={feedbackMsg}
                      onChange={(e) => setFeedbackMsg(e.target.value)}
                      placeholder="Describe your issue or idea..."
                      rows={4}
                      className={clsx(
                          "w-full p-3 rounded-lg border",
                          settings.colorMode === ColorMode.HIGH_CONTRAST 
                            ? "bg-black border-yellow-300 text-yellow-300 placeholder-yellow-700"
                            : "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                      )}
                      required
                  />
              </div>

              <Button 
                  colorMode={settings.colorMode} 
                  label="Send Feedback" 
                  type="submit"
                  className="w-full"
                  icon={<Send className="w-5 h-5" />}
              />
           </form>
      </section>
    </div>
  );
};