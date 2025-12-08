
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
    ? "flex flex-col h-full" 
    : clsx(
        "fixed inset-0 z-50 flex flex-col",
        isHighContrast ? "bg-black" : "bg-white dark:bg-gray-900"
      );

  return (
    <div className={containerClass} role="region" aria-label="PineX AI Assistant">
      <div className={clsx(
          "shrink-0 flex justify-between items-center",
          isEmbedded ? "p-4 pb-2 border-b border-inherit" : "p-4 border-b bg-inherit"
      )}>
          <div className="flex items-center gap-3">
             {onBack && (
                 <Button 
                    label="Back to Reading"
                    onClick={onBack}
                    colorMode={settings.colorMode}
                    variant="secondary"
                    icon={<ChevronLeft className="w-5 h-5" />}
                    className="p-1.5 h-auto rounded-full"
                 />
             )}
             <div className="flex flex-col">
                <h2 className={clsx("font-bold flex items-center gap-2", isEmbedded ? "text-xl" : "text-xl")}>
                    <PineappleLogo className="w-8 h-8" /> PineX
                </h2>
             </div>
          </div>

          <div className="flex items-center gap-2">
               <div className="flex gap-1">
                   <button
                      onClick={() => setUseSearch(!useSearch)}
                      className={clsx(
                          "p-2 rounded-lg border transition-all",
                          useSearch 
                            ? (isHighContrast ? "bg-yellow-300 text-black border-white" : "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300")
                            : (isHighContrast ? "border-yellow-300 text-yellow-300" : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800")
                      )}
                      aria-label={`Toggle Web Search ${useSearch ? 'On' : 'Off'}`}
                      aria-pressed={useSearch}
                  >
                       <Globe className="w-5 h-5" />
                   </button>
               </div>
               <div className="flex gap-1">
                   <button
                      onClick={() => setUseThinking(!useThinking)}
                      className={clsx(
                          "p-2 rounded-lg border transition-all",
                          useThinking 
                            ? (isHighContrast ? "bg-yellow-300 text-black border-white" : "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900 dark:text-purple-300")
                            : (isHighContrast ? "border-yellow-300 text-yellow-300" : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800")
                      )}
                      aria-label={`Toggle Deep Thinking ${useThinking ? 'On' : 'Off'}`}
                      aria-pressed={useThinking}
                  >
                       <Brain className="w-5 h-5" />
                   </button>
               </div>
               <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
               <div>
                   <button onClick={handleClearChat} className={clsx("p-2 rounded-lg border border-transparent transition-all", isHighContrast ? "text-yellow-300 hover:text-white" : "text-gray-500 hover:text-red-500")} aria-label="Clear Chat">
                       <Trash2 className="w-5 h-5" />
                   </button>
               </div>
               {!isEmbedded && (
                   <div className="ml-2">
                       <Button label="Close" onClick={onClose} colorMode={settings.colorMode} variant="secondary" icon={<X className="w-5 h-5" />} />
                   </div>
               )}
          </div>
      </div>

      <div className={clsx("flex-1 overflow-y-auto p-4 space-y-4 pb-24", THEME_CLASSES[settings.colorMode])}>
        {messages.map((msg, i) => (
            <div key={i} className={clsx(
                "w-full flex",
                msg.role === 'user' ? "justify-end" : "justify-start"
            )}>
                {msg.role === 'model' && (
                     <div className="shrink-0 mr-2 mt-1">
                         <PineappleLogo className="w-8 h-8 drop-shadow-sm" />
                     </div>
                )}
                
                <div className={clsx(
                    "max-w-[85%] p-4 text-base leading-relaxed flex flex-col gap-2 shadow-sm",
                    msg.role === 'user' 
                        ? (isHighContrast 
                            ? "rounded-l-2xl rounded-tr-none bg-yellow-300 text-black font-bold border-2 border-white" 
                            : "rounded-l-2xl rounded-tr-none bg-[#FFC107] text-black shadow-md")
                        : (isHighContrast 
                            ? "rounded-r-2xl rounded-tl-none bg-black text-yellow-300 border-2 border-yellow-300" 
                            : "rounded-r-2xl rounded-tl-none bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100")
                )}>
                    <div>{msg.text}</div>
                    {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t text-sm border-current opacity-75">
                            <p className="font-bold opacity-80 mb-1 text-xs uppercase tracking-wider">Sources:</p>
                            <ul className="space-y-1">
                                {msg.sources.map((source, idx) => (
                                    <li key={idx}>
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 break-all">{source.title || source.uri}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        ))}
        {isLoading && (
            <div className="flex gap-2 pl-4 py-2">
                <PineappleLogo className="w-8 h-8 animate-pulse opacity-50" />
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className={clsx(
          "absolute bottom-0 left-0 right-0 p-4 border-t z-10",
          isHighContrast ? "border-yellow-300 bg-black" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
      )}>
          <div className="flex gap-2 max-w-4xl mx-auto">
            <div className="flex-1">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask PineX..."
                    aria-label="Message Input"
                    className={clsx(
                        "w-full px-5 py-3 rounded-full focus:outline-none focus:ring-2 text-base shadow-inner",
                        isHighContrast 
                            ? "bg-black border-2 border-yellow-300 text-yellow-300 placeholder-yellow-700 focus:ring-yellow-400"
                            : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-900 dark:text-gray-100 focus:ring-[#FFC107] focus:bg-white dark:focus:bg-black"
                    )}
                />
            </div>
            <div>
                <Button 
                    colorMode={settings.colorMode} 
                    label="Send" 
                    type="submit" 
                    icon={<Send className="w-5 h-5 text-black" />} 
                    className="w-12 h-12 rounded-full !bg-[#FFC107] hover:!bg-yellow-400 p-0 flex items-center justify-center shadow-md active:scale-95 transition-transform" 
                />
            </div>
          </div>
      </form>
    </div>
  );
};
