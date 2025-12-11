
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, X, Globe, Brain, Trash2, ChevronLeft } from 'lucide-react';
import { Chat, ChatMessage } from '../types';
import { createChatSession } from '../services/geminiService';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
import { Content } from "@google/genai";
import clsx from 'clsx';
import { THEME_CLASSES } from '../constants';
import { triggerHaptic } from '../services/hapticService';
import { PineappleLogo } from './ui/PineappleLogo';

interface PineXProps {
  pageContext?: string; 
  settings: AppSettings;
  isEmbedded?: boolean; 
  onClose?: () => void;
  // App Control Callbacks
  onControlAction?: (action: string, params: any) => void;
  // Controlled State
  messages: ChatMessage[];
  onUpdateMessages: (msgs: ChatMessage[]) => void;
  // Navigation
  onBack?: () => void;
}

export const PineX: React.FC<PineXProps> = ({ 
    pageContext, 
    settings, 
    isEmbedded = true, 
    onClose,
    onControlAction,
    messages,
    onUpdateMessages,
    onBack
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [useSearch, setUseSearch] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  
  const chatSession = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  useEffect(() => {
      messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    // Re-init session when context or settings change
    // We map existing messages to history format
    const history: Content[] = messagesRef.current.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    chatSession.current = createChatSession({
        context: pageContext,
        enableSearch: useSearch,
        enableThinking: useThinking,
        history: history
    });
  }, [pageContext, useSearch, useThinking]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClearChat = () => {
      const initialMsg: ChatMessage = { role: 'model', text: 'Hi! I’m PineX. I’ve read your document. Ask me anything. 🍍' };
      onUpdateMessages([initialMsg]);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chatSession.current) return;

    const userMsg = input;
    setInput('');
    
    // Optimistic update
    const newHistory: ChatMessage[] = [...messages, { role: 'user', text: userMsg }];
    onUpdateMessages(newHistory);
    setIsLoading(true);

    try {
      // Send message
      const result = await chatSession.current.sendMessage({ message: userMsg });
      
      // 1. Handle Function Calls (App Control)
      const toolCalls = result.functionCalls;
      if (toolCalls && toolCalls.length > 0 && onControlAction) {
          for (const call of toolCalls) {
              onControlAction(call.name, call.args);
          }
      }

      // 2. Handle Text Response
      const responseText = result.text;
      const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = groundingChunks?.map((chunk: any) => chunk.web).filter((w: any) => w);

      if (responseText) {
        onUpdateMessages([...newHistory, { 
            role: 'model', 
            text: responseText,
            sources: sources
        }]);
        triggerHaptic('light');
      } else if (toolCalls && toolCalls.length > 0) {
        // Fallback: If tool was called but no text returned, show confirmation
        onUpdateMessages([...newHistory, { 
            role: 'model', 
            text: "Action completed! 🍍" 
        }]);
        triggerHaptic('success');
      } else {
        throw new Error("Empty response");
      }

    } catch (error) {
      console.error("PineX Error", error);
      onUpdateMessages([...newHistory, { role: 'model', text: "I'm having trouble connecting right now. Please try again or check your internet." }]);
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  const containerClass = isEmbedded 
    ? "flex flex-col h-full bg-inherit" 
    : clsx(
        "fixed inset-0 z-50 flex flex-col",
        isHighContrast ? "bg-black" : "bg-white dark:bg-gray-900"
      );

  return (
    <div className={containerClass} role="region" aria-label="PineX AI Assistant">
      {/* HEADER */}
      <div className={clsx(
          "shrink-0 flex justify-between items-center z-20 backdrop-blur-md sticky top-0",
          isEmbedded ? "p-4 pb-2 border-b border-inherit bg-inherit/90" : "p-4 border-b bg-inherit/90"
      )}>
          <div className="flex items-center gap-3">
             {onBack && (
                 <Button 
                    label="Back"
                    onClick={onBack}
                    colorMode={settings.colorMode}
                    variant="secondary"
                    icon={<ChevronLeft className="w-5 h-5" />}
                    className="p-1.5 h-auto rounded-full shadow-sm"
                 />
             )}
             <div className="flex items-center gap-2">
                <PineappleLogo className="w-8 h-8 drop-shadow-md" />
                <h2 className={clsx("font-bold tracking-tight", isEmbedded ? "text-xl" : "text-xl")}>
                    PineX
                </h2>
             </div>
          </div>

          <div className="flex items-center gap-2">
               <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                   <button
                      onClick={() => setUseSearch(!useSearch)}
                      className={clsx(
                          "p-2 rounded-lg transition-all-300",
                          useSearch 
                            ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400"
                            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      )}
                      aria-label={`Web Search ${useSearch ? 'On' : 'Off'}`}
                      aria-pressed={useSearch}
                  >
                       <Globe className="w-5 h-5" />
                   </button>
                   <button
                      onClick={() => setUseThinking(!useThinking)}
                      className={clsx(
                          "p-2 rounded-lg transition-all-300",
                          useThinking 
                             ? "bg-white dark:bg-gray-700 shadow-sm text-purple-600 dark:text-purple-400"
                            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      )}
                      aria-label={`Deep Thinking ${useThinking ? 'On' : 'Off'}`}
                      aria-pressed={useThinking}
                  >
                       <Brain className="w-5 h-5" />
                   </button>
               </div>
               
               <button 
                  onClick={handleClearChat} 
                  className={clsx("p-2 rounded-lg transition-all-300 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500")} 
                  aria-label="Clear Chat"
               >
                   <Trash2 className="w-5 h-5" />
               </button>
               
               {!isEmbedded && (
                   <div className="ml-2">
                       <Button label="Close" onClick={onClose} colorMode={settings.colorMode} variant="secondary" icon={<X className="w-5 h-5" />} />
                   </div>
               )}
          </div>
      </div>

      {/* CHAT AREA */}
      <div className={clsx("flex-1 overflow-y-auto p-4 space-y-6 pb-32 scroll-smooth", THEME_CLASSES[settings.colorMode])}>
        {messages.map((msg, i) => (
            <div key={i} className={clsx(
                "w-full flex animate-in slide-in-from-bottom-2 duration-300",
                msg.role === 'user' ? "justify-end" : "justify-start"
            )}>
                {msg.role === 'model' && (
                     <div className="shrink-0 mr-3 mt-auto mb-1">
                         <PineappleLogo className="w-8 h-8 drop-shadow-md" />
                     </div>
                )}
                
                <div className={clsx(
                    "max-w-[85%] p-4 text-[1.05rem] leading-relaxed flex flex-col gap-2 shadow-sm relative transition-all-300",
                    msg.role === 'user' 
                        ? (isHighContrast 
                            ? "rounded-2xl rounded-tr-sm bg-yellow-300 text-black font-bold border-2 border-white" 
                            : "rounded-2xl rounded-tr-sm bg-[#FFC107] text-black shadow-md")
                        : (isHighContrast 
                            ? "rounded-2xl rounded-tl-sm bg-black text-yellow-300 border-2 border-yellow-300" 
                            : "rounded-2xl rounded-tl-sm bg-yellow-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-black/5 dark:border-white/5")
                )}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    
                    {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 text-sm">
                            <p className="font-bold opacity-70 mb-2 text-xs uppercase tracking-wider flex items-center gap-1">
                                <Globe className="w-3 h-3" /> Sources
                            </p>
                            <ul className="space-y-2">
                                {msg.sources.map((source, idx) => (
                                    <li key={idx} className="bg-black/5 dark:bg-white/5 p-2 rounded hover:bg-black/10 transition-colors">
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="block truncate hover:underline text-xs font-medium">
                                            {source.title || source.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        ))}
        {isLoading && (
            <div className="flex gap-3 pl-4 py-2 animate-in fade-in">
                <PineappleLogo className="w-8 h-8 animate-pulse opacity-50" />
                <div className={clsx(
                    "flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm",
                    isHighContrast ? "bg-black border border-yellow-300" : "bg-gray-100 dark:bg-gray-800"
                )}>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <form onSubmit={handleSend} className={clsx(
          "absolute bottom-0 left-0 right-0 px-4 py-4 z-30 transition-colors safe-area-pb",
           isHighContrast 
            ? "border-t border-yellow-300 bg-black" 
            : "border-t border-gray-200/50 dark:border-gray-800/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl"
      )}>
          <div className="flex gap-3 max-w-4xl mx-auto items-end">
            <div className="flex-1 relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask PineX anything..."
                    aria-label="Message Input"
                    className={clsx(
                        "w-full px-6 py-4 rounded-3xl focus:outline-none focus:ring-2 text-base shadow-sm transition-all-300",
                        isHighContrast 
                            ? "bg-black border-2 border-yellow-300 text-yellow-300 placeholder-yellow-700 focus:ring-yellow-400"
                            : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-900 dark:text-gray-100 focus:ring-[#FFC107] focus:bg-white dark:focus:bg-black placeholder-gray-500"
                    )}
                />
            </div>
            <Button 
                colorMode={settings.colorMode} 
                label="Send" 
                type="submit" 
                icon={<Send className="w-6 h-6 text-black ml-0.5" />} 
                className="w-14 h-14 rounded-full !bg-[#FFC107] hover:!bg-yellow-400 p-0 flex items-center justify-center shadow-lg active:scale-95 transition-all-300 hover:scale-105" 
            />
          </div>
      </form>
    </div>
  );
};
