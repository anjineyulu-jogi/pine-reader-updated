
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, X, Globe, Brain, Trash2 } from 'lucide-react';
import { Chat } from '../types';
import { createChatSession } from '../services/geminiService';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
import { Content } from "@google/genai";
import clsx from 'clsx';
import { THEME_CLASSES } from '../constants';

interface PineXProps {
  pageContext?: string; // Optional because it might be the main tab without a document
  settings: AppSettings;
  isEmbedded?: boolean; // If true, acts as a tab. If false, acts as a modal overlay (for Reader mode)
  onClose?: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; uri: string }[];
}

export const PineX: React.FC<PineXProps> = ({ pageContext, settings, isEmbedded = true, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am PineX. I can help you read documents or answer questions.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // AI Config State
  const [useSearch, setUseSearch] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  
  const chatSession = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Ref to track messages for session recreation without stale closures
  const messagesRef = useRef<Message[]>(messages);

  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  // Keep ref in sync
  useEffect(() => {
      messagesRef.current = messages;
  }, [messages]);

  // Initialize Chat Session with context and config
  useEffect(() => {
    // Map existing messages to SDK Content format for history preservation
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleClearChat = () => {
      const initialMsg: Message = { role: 'model', text: 'Chat cleared. How can I help you?' };
      setMessages([initialMsg]);
      // Manually reset session without history
      chatSession.current = createChatSession({
        context: pageContext,
        enableSearch: useSearch,
        enableThinking: useThinking
      });
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chatSession.current) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      // SDK Requirement: sendMessage expects { message: string }
      const result = await chatSession.current.sendMessage({ message: userMsg });
      
      const responseText = result.text;
      
      // Extract grounding metadata if present
      const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = groundingChunks?.map((chunk: any) => chunk.web).filter((w: any) => w);

      if (responseText) {
        setMessages(prev => [...prev, { 
            role: 'model', 
            text: responseText,
            sources: sources
        }]);
      } else {
        throw new Error("Empty response");
      }
    } catch (error) {
      console.error("PineX Error", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const containerClass = isEmbedded 
    ? "flex flex-col h-full pb-20" 
    : clsx(
        "fixed inset-0 z-50 flex flex-col",
        isHighContrast ? "bg-black" : "bg-white dark:bg-gray-900"
      );

  return (
    <div className={containerClass} role="region" aria-label="PineX AI Assistant">
      
      {/* Header Area */}
      <div className={clsx(
          "shrink-0 flex justify-between items-center",
          isEmbedded ? "p-6 pb-2" : "p-4 border-b bg-inherit"
      )}>
          <div className="flex flex-col">
            <h2 className={clsx("font-bold flex items-center gap-2", isEmbedded ? "text-3xl" : "text-xl")}>
                <Bot className="w-6 h-6" /> PineX
            </h2>
            {isEmbedded && <p className="opacity-80">Ask me anything about your documents.</p>}
          </div>

          <div className="flex items-center gap-2">
               {/* Controls */}
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
                  title="Enable Web Search Grounding"
               >
                   <Globe className="w-5 h-5" />
               </button>

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
                  title="Enable Deep Reasoning"
               >
                   <Brain className="w-5 h-5" />
               </button>

               <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

               <button
                  onClick={handleClearChat}
                  className={clsx(
                      "p-2 rounded-lg border border-transparent transition-all",
                      isHighContrast ? "text-yellow-300 hover:text-white" : "text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  )}
                  aria-label="Clear Chat"
                  title="Clear Conversation"
               >
                   <Trash2 className="w-5 h-5" />
               </button>

               {!isEmbedded && (
                   <Button 
                        label="Close" 
                        onClick={onClose} 
                        colorMode={settings.colorMode} 
                        variant="secondary" 
                        icon={<X className="w-5 h-5" />} 
                        className="ml-2"
                   />
               )}
          </div>
      </div>

      {/* Messages */}
      <div className={clsx("flex-1 overflow-y-auto p-4 space-y-4", THEME_CLASSES[settings.colorMode])}>
        {messages.map((msg, i) => (
            <div 
                key={i} 
                className={clsx(
                    "max-w-[85%] p-4 rounded-xl text-base leading-relaxed flex flex-col gap-2",
                    msg.role === 'user' 
                        ? (isHighContrast ? "ml-auto bg-yellow-300 text-black font-bold border-2 border-white" : "ml-auto bg-blue-600 text-white rounded-br-sm")
                        : (isHighContrast ? "bg-black text-yellow-300 border-2 border-yellow-300" : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm")
                )}
            >
                <div>{msg.text}</div>
                
                {/* Sources Display */}
                {msg.sources && msg.sources.length > 0 && (
                    <div className={clsx(
                        "mt-2 pt-2 border-t text-sm",
                        msg.role === 'user' 
                            ? "border-white/20" 
                            : (isHighContrast ? "border-yellow-300/50" : "border-gray-300 dark:border-gray-600")
                    )}>
                        <p className="font-bold opacity-80 mb-1 text-xs uppercase tracking-wider">Sources:</p>
                        <ul className="space-y-1">
                            {msg.sources.map((source, idx) => (
                                <li key={idx}>
                                    <a 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="underline hover:opacity-80 break-all"
                                    >
                                        {source.title || source.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        ))}
        {isLoading && (
            <div className="flex gap-2 pl-4 py-2">
                <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className={clsx(
          "p-4 border-t",
          isHighContrast ? "border-yellow-300 bg-black" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      )}>
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask PineX..."
                className={clsx(
                    "flex-1 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 text-lg",
                    isHighContrast 
                        ? "bg-black border-2 border-yellow-300 text-yellow-300 placeholder-yellow-700 focus:ring-yellow-400"
                        : "bg-gray-100 dark:bg-gray-700 border-transparent text-gray-900 dark:text-gray-100 focus:ring-blue-500"
                )}
            />
            <Button 
                colorMode={settings.colorMode} 
                label="Send" 
                type="submit"
                icon={<Send className="w-6 h-6" />}
                className="px-6"
            />
          </div>
      </form>
    </div>
  );
};
