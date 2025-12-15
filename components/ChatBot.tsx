
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, X, Globe, Brain, Trash2, ChevronLeft, Mic, PhoneOff, ArrowLeft, AlertTriangle, Headphones, HelpCircle, Play, Pause, SkipBack, SkipForward, Download, XCircle, CheckCircle } from 'lucide-react';
import { Chat, ChatMessage, AppSettings, ColorMode, Content, PineXAction, QuizQuestion } from '../types';
import { createChatSession, startLiveSession, generateDocumentQuiz, generatePodcastScript, generateMultiSpeakerSpeech } from '../services/geminiService';
import { Button } from './ui/Button';
import clsx from 'clsx';
import { THEME_CLASSES } from '../constants';
import { triggerHaptic } from '../services/hapticService';
import { PineappleLogo } from './ui/PineappleLogo';
import { playCompletionSound, playStartSound, base64ToUint8Array, createWavBlob } from '../services/audioService';
import { AIDisclaimer } from './AIDisclaimer';
import { PodcastPlayer } from './PodcastPlayer';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface PineXProps {
  pageContext?: string;
  fullDocText?: string; // New prop for Podcast/Quiz features
  settings: AppSettings;
  isEmbedded?: boolean; 
  onClose?: () => void;
  onControlAction?: (action: string, params: any) => void;
  messages: ChatMessage[];
  onUpdateMessages: (msgs: ChatMessage[]) => void;
  onBack?: () => void;
}

export const PineX: React.FC<PineXProps> = ({ 
    pageContext,
    fullDocText,
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
  
  // LIVE MODE STATE
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveVolume, setLiveVolume] = useState(0);
  const [liveStatus, setLiveStatus] = useState<'Connecting...' | 'Listening' | 'Speaking' | 'Error'>('Connecting...');
  
  // PODCAST STATE
  const [showPodcastPlayer, setShowPodcastPlayer] = useState(false);
  const [podcastBlob, setPodcastBlob] = useState<Blob | null>(null);

  // QUIZ STATE
  const [quizActive, setQuizActive] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);

  const stopLiveSessionRef = useRef<() => void>(() => {});
  const chatSession = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  useEffect(() => {
      messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const history: Content[] = messagesRef.current.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    chatSession.current = createChatSession({
        context: fullDocText || pageContext, // Prefer full text if available for better answers
        enableSearch: useSearch,
        enableThinking: useThinking,
        history: history
    });
  }, [pageContext, fullDocText, useSearch, useThinking]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, quizActive]);

  useEffect(() => {
      return () => {
          if (stopLiveSessionRef.current) stopLiveSessionRef.current();
      };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClearChat = () => {
      let text = "Hi! I'm Pine-X. I can help you change settings, navigate the app, or answer general questions. 🍍";
      if (pageContext) text = "Ready to help with your document. Ask me anything.";
      const initialMsg: ChatMessage = { role: 'model', text };
      onUpdateMessages([initialMsg]);
      setQuizActive(false);
      setShowPodcastPlayer(false);
      setPodcastBlob(null);
  };

  // --- PODCAST FEATURE ---
  const startPodcast = async () => {
      if (!fullDocText) return;
      triggerHaptic('medium');
      setShowPodcastPlayer(false);
      setIsLoading(true);
      
      onUpdateMessages([...messages, { role: 'model', text: "Drafting an engaging podcast script with Alex & Maya. This will take a moment..." }]);
      
      try {
          // 1. Generate Script
          const script = await generatePodcastScript(fullDocText);
          
          if (!script) {
               throw new Error("Script generation failed");
          }

          onUpdateMessages([...messages, { role: 'model', text: "Script ready! Recording the conversation now..." }]);
          
          // 2. Multi-Speaker TTS (Chunked)
          const audioBytes = await generateMultiSpeakerSpeech(script);

          if (audioBytes) {
              const wavBlob = createWavBlob(audioBytes, 24000); // 24kHz matches Gemini Flash TTS
              setPodcastBlob(wavBlob);
              setShowPodcastPlayer(true);
              onUpdateMessages([...messages, { role: 'model', text: "Podcast ready! Playing now." }]);
          } else {
              throw new Error("No audio data received");
          }
      } catch (e) {
          console.error("Podcast gen failed", e);
          onUpdateMessages([...messages, { role: 'model', text: "Sorry, I couldn't generate the podcast right now." }]);
          setShowPodcastPlayer(false);
      } finally {
          setIsLoading(false);
      }
  };

  const handleExportPodcast = async () => {
      if (!podcastBlob) return;
      
      try {
          // Convert Blob to Base64 for saving
          const reader = new FileReader();
          reader.readAsDataURL(podcastBlob);
          reader.onloadend = async () => {
              const base64data = reader.result as string;
              // Strip metadata prefix if present (data:audio/wav;base64,)
              const base64Content = base64data.split(',')[1];
              const filename = `pine_podcast_${Date.now()}.wav`;

              if (Capacitor.getPlatform() === 'web') {
                  // Direct Browser Download
                  const a = document.createElement('a');
                  a.href = base64data;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  alert("Podcast downloaded!");
              } else {
                  // Android/iOS Filesystem Write
                  await Filesystem.writeFile({
                      path: filename,
                      data: base64Content,
                      directory: Directory.Documents, // Safe, accessible directory
                  });
                  alert(`Saved to Documents: ${filename}`);
              }
          };
      } catch (e) {
          console.error("Export failed", e);
          alert("Could not save file.");
      }
  };

  // --- QUIZ FEATURE ---
  const startQuiz = async () => {
      if (!fullDocText) return;
      triggerHaptic('medium');
      setQuizActive(true);
      setQuizScore(0);
      setCurrentQuizIndex(0);
      setQuizQuestions([]);
      
      onUpdateMessages([...messages, { role: 'model', text: "Generating a quiz from your document..." }]);
      
      try {
          const questions = await generateDocumentQuiz(fullDocText);
          if (questions && questions.length > 0) {
              setQuizQuestions(questions);
              // Present first question
              const q = questions[0];
              onUpdateMessages([...messages, { 
                  role: 'model', 
                  text: `Question 1: ${q.question}\n\n${q.options.map((o, i) => `${String.fromCharCode(65+i)}. ${o}`).join('\n')}`,
                  isQuiz: true
              }]);
          } else {
              setQuizActive(false);
              onUpdateMessages([...messages, { role: 'model', text: "Could not generate questions from this text." }]);
          }
      } catch (e) {
          setQuizActive(false);
      }
  };

  const handleQuizAnswer = (answer: string) => {
      const currentQ = quizQuestions[currentQuizIndex];
      if (!currentQ) return;

      const isCorrect = answer.toLowerCase().includes(currentQ.correctAnswer.toLowerCase()) || 
                        (answer.length === 1 && currentQ.correctAnswer.startsWith(answer)); // Simple match A/B/C/D

      let feedback = "";
      if (isCorrect) {
          setQuizScore(s => s + 1);
          feedback = `Correct! ${currentQ.explanation}`;
          triggerHaptic('success');
      } else {
          feedback = `Not quite. The correct answer is ${currentQ.correctAnswer}. ${currentQ.explanation}`;
          triggerHaptic('error');
      }

      const nextIdx = currentQuizIndex + 1;
      let nextMsg = "";
      
      if (nextIdx < quizQuestions.length) {
          setCurrentQuizIndex(nextIdx);
          const q = quizQuestions[nextIdx];
          nextMsg = `\n\nQuestion ${nextIdx + 1}: ${q.question}\n\n${q.options.map((o, i) => `${String.fromCharCode(65+i)}. ${o}`).join('\n')}`;
      } else {
          setQuizActive(false);
          nextMsg = `\n\nQuiz Complete! You got ${quizScore + (isCorrect?1:0)} out of ${quizQuestions.length} correct.`;
      }

      onUpdateMessages([...messages, 
          { role: 'user', text: answer },
          { role: 'model', text: feedback + nextMsg, isQuiz: true }
      ]);
  };

  // --- LIVE SESSION ---
  const handleToggleLive = async () => {
      if (isLiveActive) {
          stopLiveSessionRef.current();
          setIsLiveActive(false);
          triggerHaptic('medium');
      } else {
          setIsLiveActive(true);
          setLiveStatus('Connecting...');
          triggerHaptic('medium');
          playStartSound();

          const connection = await startLiveSession(
              {
                  onConnect: () => {
                      setLiveStatus('Listening');
                      triggerHaptic('success');
                  },
                  onDisconnect: () => {
                      setIsLiveActive(false);
                      triggerHaptic('light');
                  },
                  onError: (e) => {
                      setLiveStatus('Error');
                      triggerHaptic('error');
                      setTimeout(() => setIsLiveActive(false), 2000);
                  },
                  onAudioLevel: (level) => {
                      setLiveVolume(prev => prev * 0.8 + level * 0.2);
                  }
              },
              settings.voiceName,
              pageContext
          );
          stopLiveSessionRef.current = connection.disconnect;
      }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chatSession.current) return;

    // Intercept quiz answers
    if (quizActive) {
        const ans = input;
        setInput('');
        handleQuizAnswer(ans);
        return;
    }

    const userMsg = input;
    setInput('');
    
    const newHistory: ChatMessage[] = [...messages, { role: 'user', text: userMsg }];
    onUpdateMessages(newHistory);
    setIsLoading(true);

    try {
      const result = await chatSession.current.sendMessage({ message: userMsg });
      
      const toolCalls = result.functionCalls;
      let actionTaken = false;
      if (toolCalls && toolCalls.length > 0 && onControlAction) {
          for (const call of toolCalls) {
              if (call.name === 'execute_app_action') {
                  const pineAction = call.args as PineXAction;
                  if (pineAction.action && pineAction.payload) {
                      onControlAction(pineAction.action, pineAction.payload);
                      actionTaken = true;
                  }
              }
          }
      }

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
      } else if (actionTaken) {
        onUpdateMessages([...newHistory, { 
            role: 'model', 
            text: "Done! I've updated the app as requested. 🍍" 
        }]);
        triggerHaptic('success');
      } else {
        onUpdateMessages([...newHistory, { 
            role: 'model', 
            text: "I didn't quite get that. Could you rephrase?" 
        }]);
      }

    } catch (error) {
      console.error("Pine-X Error", error);
      onUpdateMessages([...newHistory, { role: 'model', text: "I'm having trouble connecting right now. Please try again or check your internet." }]);
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
      playCompletionSound();
    }
  };

  const containerClass = isEmbedded 
    ? "flex flex-col h-full bg-inherit" 
    : clsx(
        "fixed inset-0 z-50 flex flex-col",
        isHighContrast ? "bg-black" : "bg-white dark:bg-gray-900"
      );

  // --- LIVE OVERLAY ---
  if (isLiveActive) {
      return (
          <div className={clsx(
              "absolute inset-0 z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300",
              isHighContrast ? "bg-black" : "bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-950"
          )}>
               <div className="absolute top-6 right-6">
                   <Button 
                        label="Close" 
                        onClick={handleToggleLive} 
                        colorMode={settings.colorMode} 
                        variant="ghost" 
                        icon={<X className="w-8 h-8" />}
                   />
               </div>
               <div className="relative mb-12 flex items-center justify-center">
                   <div className={clsx("absolute inset-0 rounded-full opacity-30 animate-ping", isHighContrast ? "bg-yellow-300" : "bg-blue-500")} style={{ transform: `scale(${1 + liveVolume * 5})` }} />
                   <div className={clsx("absolute inset-0 rounded-full opacity-20", isHighContrast ? "bg-yellow-300" : "bg-blue-400")} style={{ transform: `scale(${1 + liveVolume * 3})`, transition: 'transform 0.1s' }} />
                   <div className={clsx("w-32 h-32 rounded-full flex items-center justify-center shadow-2xl relative z-10", isHighContrast ? "bg-yellow-300 text-black border-4 border-white" : "bg-white dark:bg-gray-800")}>
                       <PineappleLogo className="w-20 h-20" />
                   </div>
               </div>
               <h3 className={clsx("text-2xl font-bold mb-8 animate-pulse", isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white")}>{liveStatus}</h3>
               <Button 
                   label="End Voice Chat"
                   onClick={handleToggleLive}
                   colorMode={settings.colorMode}
                   className={clsx("w-20 h-20 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all border-4", isHighContrast ? "bg-red-600 border-yellow-300 text-white" : "bg-red-500 border-red-200 text-white hover:bg-red-600")}
                   icon={<PhoneOff className="w-8 h-8 fill-current" />}
               />
               <p className={clsx("mt-8 text-sm font-medium opacity-70", isHighContrast ? "text-yellow-100" : "text-gray-500")}>Gemini Live is active</p>
          </div>
      );
  }

  return (
    <div className={containerClass} role="region" aria-label="Pine-X AI Assistant">
      {/* HEADER */}
      <div className={clsx(
          "shrink-0 flex justify-between items-center z-20 backdrop-blur-md sticky top-0",
          isEmbedded ? "p-4 pb-2 border-b border-inherit bg-inherit/90" : "p-4 border-b bg-inherit/90"
      )}>
          <div className="flex items-center gap-3">
             {onBack && (
                 <Button 
                    label="Back to Documents"
                    onClick={onBack}
                    colorMode={settings.colorMode}
                    variant="secondary"
                    icon={<ArrowLeft className="w-5 h-5" />} 
                    className="p-1.5 h-auto rounded-full shadow-sm"
                 />
             )}
             <div className="flex items-center gap-2">
                <PineappleLogo className="w-8 h-8 drop-shadow-md" />
                <h2 className={clsx("font-bold tracking-tight", isEmbedded ? "text-xl" : "text-xl")}>Pine-X</h2>
             </div>
          </div>

          <div className="flex items-center gap-2">
               <button
                  onClick={handleToggleLive}
                  className={clsx(
                      "p-2 rounded-lg transition-all-300 mr-2",
                      isHighContrast 
                        ? "text-yellow-300 border-2 border-yellow-300 hover:bg-yellow-300 hover:text-black" 
                        : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100"
                  )}
                  aria-label="Start Voice Chat"
               >
                   <Mic className="w-5 h-5" />
               </button>

               <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                   <button onClick={() => setUseSearch(!useSearch)} className={clsx("p-2 rounded-lg transition-all-300", useSearch ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300")} aria-label={`Web Search ${useSearch ? 'On' : 'Off'}`} aria-pressed={useSearch}><Globe className="w-5 h-5" /></button>
                   <button onClick={() => setUseThinking(!useThinking)} className={clsx("p-2 rounded-lg transition-all-300", useThinking ? "bg-white dark:bg-gray-700 shadow-sm text-purple-600 dark:text-purple-400" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300")} aria-label={`Deep Thinking ${useThinking ? 'On' : 'Off'}`} aria-pressed={useThinking}><Brain className="w-5 h-5" /></button>
               </div>
               
               <button onClick={handleClearChat} className={clsx("p-2 rounded-lg transition-all-300 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500")} aria-label="Clear Chat"><Trash2 className="w-5 h-5" /></button>
               {onClose && (<div className="ml-2"><Button label="Close" onClick={onClose} colorMode={settings.colorMode} variant="secondary" icon={<X className="w-5 h-5" />} /></div>)}
          </div>
      </div>

      {/* CHAT AREA */}
      <div className={clsx("flex-1 overflow-y-auto p-4 space-y-6 pb-40 scroll-smooth", THEME_CLASSES[settings.colorMode])}>
        {messages.map((msg, i) => (
            <div key={i} className={clsx("w-full flex animate-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={clsx(
                    "max-w-[90%] p-4 text-[1.05rem] leading-relaxed flex flex-col gap-2 shadow-sm relative transition-all-300",
                    msg.role === 'user' 
                        ? (isHighContrast ? "rounded-2xl rounded-tr-sm bg-yellow-300 text-black font-bold border-2 border-white" : "rounded-2xl rounded-tr-sm bg-[#FFC107] text-black shadow-md")
                        : (isHighContrast ? "rounded-2xl rounded-tl-sm bg-black text-yellow-300 border-2 border-yellow-300" : "rounded-2xl rounded-tl-sm bg-yellow-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-black/5 dark:border-white/5")
                )}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 text-sm">
                            <p className="font-bold opacity-70 mb-2 text-xs uppercase tracking-wider flex items-center gap-1"><Globe className="w-3 h-3" /> Sources</p>
                            <ul className="space-y-2">{msg.sources.map((source, idx) => (<li key={idx} className="bg-black/5 dark:bg-white/5 p-2 rounded hover:bg-black/10 transition-colors"><a href={source.uri} target="_blank" rel="noopener noreferrer" className="block truncate hover:underline text-xs font-medium">{source.title || source.uri}</a></li>))}</ul>
                        </div>
                    )}
                </div>
            </div>
        ))}
        {isLoading && (
            <div className="flex gap-3 pl-4 py-2 animate-in fade-in">
                <PineappleLogo className="w-8 h-8 animate-pulse opacity-50" />
                <div className={clsx("flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm", isHighContrast ? "bg-black border border-yellow-300" : "bg-gray-100 dark:bg-gray-800")}>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
            </div>
        )}
        
        {/* INLINE PODCAST PLAYER */}
        {showPodcastPlayer && podcastBlob && (
            <PodcastPlayer 
                audioBlob={podcastBlob} 
                onClose={() => setShowPodcastPlayer(false)} 
                onExport={handleExportPodcast}
                settings={settings}
            />
        )}

        <div className="mb-4 px-2">
            <AIDisclaimer colorMode={settings.colorMode} />
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className={clsx(
          "absolute bottom-0 left-0 right-0 px-4 py-4 z-30 transition-colors safe-area-pb",
           isHighContrast 
            ? "border-t border-yellow-300 bg-black" 
            : "border-t border-gray-200/50 dark:border-gray-800/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl"
      )}>
          {/* QUICK ACTIONS FOR DOCUMENT CONTEXT */}
          {(pageContext || fullDocText) && !quizActive && !showPodcastPlayer && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                  <button 
                      onClick={startPodcast}
                      className={clsx(
                          "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm border-2 shrink-0 transition-all active:scale-95",
                          isHighContrast ? "border-yellow-300 text-yellow-300 bg-black" : "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                      )}
                  >
                      <Headphones className="w-4 h-4" /> Listen to Podcast
                  </button>
                  <button 
                      onClick={startQuiz}
                      className={clsx(
                          "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm border-2 shrink-0 transition-all active:scale-95",
                          isHighContrast ? "border-yellow-300 text-yellow-300 bg-black" : "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                      )}
                  >
                      <HelpCircle className="w-4 h-4" /> Generate Quiz
                  </button>
              </div>
          )}

          <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto items-end">
            <div className="flex-1 relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={quizActive ? "Type your answer..." : "Ask Pine-X anything..."}
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
          </form>
      </div>
    </div>
  );
};
