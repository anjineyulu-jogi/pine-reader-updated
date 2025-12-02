import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, X } from 'lucide-react';
import { Chat } from '../types';
import { createChatSession } from '../services/geminiService';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
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
}

export const PineX: React.FC<PineXProps> = ({ pageContext, settings, isEmbedded = true, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am PineX. I can help you read documents or answer questions.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatSession = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  // Initialize Chat Session with context if available
  useEffect(() => {
    chatSession.current = createChatSession(pageContext);
  }, [pageContext]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      
      // SDK Requirement: Access .text property directly
      const responseText = result.text;

      if (responseText) {
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
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
      
      {/* Header if not embedded (Reader Mode Modal) */}
      {!isEmbedded && (
          <div className="p-4 border-b flex justify-between items-center bg-inherit">
              <h2 className="text-xl font-bold flex items-center gap-2">
                  <Bot className="w-6 h-6" /> PineX
              </h2>
              <Button 
                label="Close" 
                onClick={onClose} 
                colorMode={settings.colorMode} 
                variant="secondary" 
                icon={<X className="w-5 h-5" />} 
              />
          </div>
      )}

      {/* Header if embedded (Tab Mode) */}
      {isEmbedded && (
          <header className="p-6 pb-2">
            <h2 className="text-3xl font-bold mb-2">PineX AI</h2>
            <p className="opacity-80">Ask me anything about your documents.</p>
          </header>
      )}

      {/* Messages */}
      <div className={clsx("flex-1 overflow-y-auto p-4 space-y-4", THEME_CLASSES[settings.colorMode])}>
        {messages.map((msg, i) => (
            <div 
                key={i} 
                className={clsx(
                    "max-w-[85%] p-4 rounded-xl text-base leading-relaxed",
                    msg.role === 'user' 
                        ? (isHighContrast ? "ml-auto bg-yellow-300 text-black font-bold border-2 border-white" : "ml-auto bg-blue-600 text-white rounded-br-sm")
                        : (isHighContrast ? "bg-black text-yellow-300 border-2 border-yellow-300" : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm")
                )}
            >
                {msg.text}
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