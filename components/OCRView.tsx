
import React, { useRef, useState, useEffect } from 'react';
import { Camera, ArrowLeft, Loader2, Zap, ZapOff, Mic, MicOff, Volume2, Save, X, Check, RotateCcw, Pause, Play, Snowflake, Phone, MapPin, Languages, StopCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { AppSettings, ColorMode, LiveConnection, DocumentType, ParsedDocument } from '../types';
import clsx from 'clsx';
import { triggerHaptic } from '../services/hapticService';
import { startLiveSession, analyzeFrozenFrame } from '../services/geminiService';
import { speakSystemMessage } from '../services/ttsService';
import { saveRecentFileToStorage, saveParsedDocument } from '../services/storageService';

interface OCRViewProps {
  settings: AppSettings;
  onBack: () => void;
}

// Simple Waveform Visualizer Component
const Waveform: React.FC<{ level: number; active: boolean; colorMode: ColorMode }> = ({ level, active, colorMode }) => {
    const bars = 5;
    const isHighContrast = colorMode === ColorMode.HIGH_CONTRAST;
    
    return (
        <div className="flex items-center justify-center gap-1 h-8 w-16" aria-hidden="true">
            {Array.from({ length: bars }).map((_, i) => {
                // simple animation simulation + level reaction
                const height = active ? Math.max(20, Math.min(100, level * 100 + Math.random() * 30)) : 10;
                return (
                    <div 
                        key={i}
                        className={clsx(
                            "w-1.5 rounded-full transition-all duration-100",
                            isHighContrast ? "bg-yellow-300" : "bg-[#FFC107]"
                        )}
                        style={{ height: `${height}%`, opacity: active ? 1 : 0.3 }}
                    />
                );
            })}
        </div>
    );
};

export const OCRView: React.FC<OCRViewProps> = ({ settings, onBack }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'Ready' | 'Connecting' | 'Live' | 'Error'>('Ready');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [autoFlashEnabled, setAutoFlashEnabled] = useState(true);
  
  // Features State
  const [autoReadEnabled, setAutoReadEnabled] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  
  // Live State
  const [transcript, setTranscript] = useState<{text: string, isUser: boolean}[]>([]);
  const [liveVolume, setLiveVolume] = useState(0);
  const [lastOcrText, setLastOcrText] = useState<string>("");
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  
  // Entity State
  const [detectedPhone, setDetectedPhone] = useState<string | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const connectionRef = useRef<LiveConnection | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const lastLowLightWarningTime = useRef<number>(0);

  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  // Initialize Camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
        speakSystemMessage("Camera active. Ready to read.");
      } catch (err) {
        console.error("Camera error:", err);
        setHasPermission(false);
        speakSystemMessage("Camera permission denied.");
      }
    };
    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      stopSession(); 
    };
  }, [facingMode]);

  // Scroll transcript and update Last Text
  useEffect(() => {
      if (transcriptEndRef.current) {
          transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      
      const lastAiMessage = [...transcript].reverse().find(t => !t.isUser);
      if (lastAiMessage && lastAiMessage.text.trim().length > 0) {
          const text = lastAiMessage.text;
          setLastOcrText(text);
          parseEntities(text);
          detectScript(text);
      }
  }, [transcript]);

  // Script Detector
  const detectScript = (text: string) => {
      const ranges = [
          { name: "Hindi", regex: /[\u0900-\u097F]/ },
          { name: "Telugu", regex: /[\u0C00-\u0C7F]/ },
          { name: "Tamil", regex: /[\u0B80-\u0BFF]/ },
          { name: "Kannada", regex: /[\u0C80-\u0CFF]/ },
          { name: "Malayalam", regex: /[\u0D00-\u0D7F]/ },
          { name: "English", regex: /[A-Za-z]/ }
      ];
      
      for (const lang of ranges) {
          if (lang.regex.test(text)) {
              setDetectedLanguage(lang.name);
              return;
          }
      }
  };

  // Entity Parser
  const parseEntities = (text: string) => {
      // 1. Phone Numbers (Keyword match from Prompt or Regex fallback)
      const phoneMatch = text.match(/Phone found: ([\d\s\-\+]+)/i) || text.match(/(?:(?:\+|0{0,2})91(\s*[\ -]\s*)?|[0]?)?[789]\d{9}/);
      if (phoneMatch) {
          const number = phoneMatch[1] || phoneMatch[0];
          setDetectedPhone(number.replace(/[^\d\+]/g, ''));
      }

      // 2. Addresses (Keyword match from Prompt)
      const addressMatch = text.match(/Address found: ([^.]+)/i);
      if (addressMatch) {
          setDetectedAddress(addressMatch[1].trim());
      }
  };

  const handleCall = () => {
      if (detectedPhone) {
          triggerHaptic('medium');
          window.open(`tel:${detectedPhone}`, '_system');
      }
  };

  const handleMap = () => {
      if (detectedAddress) {
          triggerHaptic('medium');
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detectedAddress)}`, '_system');
      }
  };

  const toggleFlash = async (forceState?: boolean) => {
      if (!videoRef.current || !videoRef.current.srcObject) return;
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      
      try {
          const capabilities = track.getCapabilities() as any;
          if (capabilities.torch) {
              const newState = forceState !== undefined ? forceState : !flashOn;
              await track.applyConstraints({ advanced: [{ torch: newState }] } as any);
              setFlashOn(newState);
              if (forceState === undefined) triggerHaptic('light'); // Only vibrate on manual toggle
          } else if (forceState === undefined) {
              speakSystemMessage("Flashlight not available.");
          }
      } catch (e) {
          console.warn("Flash control not supported");
      }
  };

  // Light Detection Helper
  const checkBrightness = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const sampleSize = 50;
      const imageData = ctx.getImageData((width - sampleSize)/2, (height - sampleSize)/2, sampleSize, sampleSize);
      const data = imageData.data;
      let sum = 0;
      for(let i = 0; i < data.length; i+=4) sum += (data[i] + data[i+1] + data[i+2]) / 3;
      const brightness = sum / (data.length / 4);
      
      if (brightness < 40 && autoFlashEnabled && !flashOn) {
          toggleFlash(true);
          const now = Date.now();
          if (now - lastLowLightWarningTime.current > 10000) {
              speakSystemMessage("Low light detected. Turning on flash.");
              lastLowLightWarningTime.current = now;
          }
      }
  };

  const startSession = async () => {
      triggerHaptic('medium');
      setSessionStatus('Connecting');
      if (autoReadEnabled) {
          speakSystemMessage("Auto-Reading enabled.");
      } else {
          speakSystemMessage("Connecting to Pine-X Live Vision.");
      }
      setTranscript([]); 
      setLastOcrText("");
      setDetectedPhone(null);
      setDetectedAddress(null);
      setDetectedLanguage(null);

      try {
          const connection = await startLiveSession(
              {
                  onConnect: () => {
                      setIsSessionActive(true);
                      setSessionStatus('Live');
                      triggerHaptic('success');
                      startFrameCapture(connection);
                  },
                  onDisconnect: () => {
                      stopSession();
                  },
                  onError: () => {
                      setSessionStatus('Error');
                      triggerHaptic('error');
                      speakSystemMessage("Connection failed.");
                      setTimeout(() => setSessionStatus('Ready'), 2000);
                  },
                  onAudioLevel: (level) => {
                      setLiveVolume(prev => prev * 0.7 + level * 0.3); 
                  },
                  onTranscript: (text, isUser) => {
                      setTranscript(prev => {
                          const last = prev[prev.length - 1];
                          if (last && last.isUser === isUser) {
                              return [...prev.slice(0, -1), { text: last.text + " " + text, isUser }];
                          }
                          return [...prev, { text, isUser }];
                      });
                  }
              },
              'Kore', // Using Kore as the balanced base voice
              "", 
              true 
          );
          
          connectionRef.current = connection;

      } catch (e) {
          console.error("Session start error", e);
          setSessionStatus('Error');
      }
  };

  const stopSession = () => {
      if (connectionRef.current) {
          connectionRef.current.disconnect();
          connectionRef.current = null;
      }
      if (frameIntervalRef.current) {
          clearInterval(frameIntervalRef.current);
          frameIntervalRef.current = null;
      }
      setIsSessionActive(false);
      setSessionStatus('Ready');
      triggerHaptic('light');
  };

  const startFrameCapture = (connection: LiveConnection) => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = window.setInterval(() => {
          if (videoRef.current && canvasRef.current && !isFrozen) {
              const video = videoRef.current;
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              
              if (ctx && video.videoWidth > 0) {
                  const scale = 0.5; 
                  canvas.width = video.videoWidth * scale;
                  canvas.height = video.videoHeight * scale;
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  checkBrightness(ctx, canvas.width, canvas.height);
                  const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                  connection.sendVideoFrame(base64);
              }
          }
      }, 1000);
  };

  const handleFreeze = async () => {
      if (isFrozen) {
          setIsFrozen(false);
          setIsDeepAnalyzing(false);
          if (videoRef.current) videoRef.current.play();
          speakSystemMessage("Resuming.");
          return;
      }
      if (!videoRef.current || !canvasRef.current) return;
      triggerHaptic('heavy');
      setIsFrozen(true);
      if (videoRef.current) videoRef.current.pause();
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx?.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

      setIsDeepAnalyzing(true);
      speakSystemMessage("Analyzing frame...");

      try {
          const result = await analyzeFrozenFrame(base64);
          setIsDeepAnalyzing(false);
          setTranscript(prev => [...prev, { text: `[Frozen Analysis]: ${result}`, isUser: false }]);
          speakSystemMessage(result);
          parseEntities(result);
          detectScript(result);
      } catch (e) {
          setIsDeepAnalyzing(false);
          speakSystemMessage("Analysis failed.");
      }
  };

  const toggleAutoRead = () => {
      const newState = !autoReadEnabled;
      setAutoReadEnabled(newState);
      triggerHaptic('medium');
      if (newState) {
          if (!isSessionActive) startSession();
          else speakSystemMessage("Auto-Read On");
      } else {
          speakSystemMessage("Auto-Read Off");
      }
  };

  const handleRepeat = () => {
      if (!lastOcrText) {
          speakSystemMessage("No text.");
          return;
      }
      triggerHaptic('medium');
      speakSystemMessage(lastOcrText);
  };

  const handleSaveClick = () => {
      if (transcript.length === 0) {
          speakSystemMessage("No text to save.");
          return;
      }
      if (isSessionActive && !isFrozen) handleFreeze(); 
      setSaveTitle(`OCR - ${new Date().toLocaleDateString()}`);
      setShowSaveModal(true);
      triggerHaptic('medium');
  };

  const confirmSave = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!saveTitle.trim()) return;
      try {
          const fullText = transcript.filter(t => !t.isUser).map(t => t.text).join('\n\n');
          if (!fullText) return;
          const file = new File([fullText], `${saveTitle}.txt`, { type: 'text/plain', lastModified: Date.now() });
          await saveRecentFileToStorage(file, { name: saveTitle, type: DocumentType.TXT, size: file.size, lastOpened: Date.now() });
          const parsedDoc: ParsedDocument = {
              metadata: { name: saveTitle, type: DocumentType.TXT, pageCount: 1, lastReadDate: Date.now(), isFullyProcessed: true },
              pages: [{ pageNumber: 1, text: fullText, semanticHtml: `<p>${fullText.replace(/\n/g, '<br>')}</p>` }],
              rawText: fullText
          };
          await saveParsedDocument(parsedDoc, saveTitle);
          triggerHaptic('success');
          speakSystemMessage("Saved.");
          setShowSaveModal(false);
          stopSession();
          onBack(); 
      } catch (e) {
          speakSystemMessage("Save failed.");
      }
  };

  // Helper for status text
  const getStatusText = () => {
      if (isDeepAnalyzing) return "Analyzing Frame...";
      if (isFrozen) return "Frame Frozen";
      if (sessionStatus === 'Connecting') return "Connecting...";
      if (sessionStatus === 'Error') return "Connection Error";
      if (autoReadEnabled) return detectedLanguage ? `Auto-Reading (${detectedLanguage})` : "Auto-Reading Active";
      return "Ready to Scan";
  };

  // Helper Button for Control Bar
  const ControlButton = ({ icon, label, onClick, active, disabled }: any) => (
      <button
          onClick={() => { if (!disabled) { triggerHaptic('light'); onClick(); } }}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
          className={clsx(
              "flex flex-col items-center justify-center gap-1 min-w-[64px] h-16 rounded-2xl transition-all active:scale-95",
              active 
                  ? (isHighContrast ? "bg-yellow-300 text-black border-2 border-white" : "bg-[#FFC107] text-black shadow-lg")
                  : (isHighContrast ? "bg-black border border-yellow-300 text-yellow-300" : "bg-white/10 text-white hover:bg-white/20"),
              disabled && "opacity-50 grayscale cursor-not-allowed"
          )}
      >
          {icon}
          <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </button>
  );

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Camera Feed */}
        <div className="absolute inset-0 z-0">
            {hasPermission === false ? (
                <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
                    <Camera className="w-16 h-16 opacity-50 mb-4" />
                    <p>Enable camera permission.</p>
                </div>
            ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
        </div>

        {/* Dark Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none z-10" />

        {/* HEADER */}
        <header className={clsx(
            "relative z-20 flex justify-between items-center p-4 pt-safe",
            isHighContrast && "border-b border-yellow-300 bg-black/80"
        )}>
            <Button
                label="Back"
                onClick={() => { stopSession(); onBack(); }}
                variant="ghost"
                colorMode={settings.colorMode}
                className="text-white hover:bg-white/20 p-2 rounded-full"
                icon={<ArrowLeft className={clsx("w-8 h-8", isHighContrast && "text-yellow-300")} />}
            />
            
            <div className="flex flex-col items-center">
                <h1 className={clsx("text-lg font-bold shadow-black drop-shadow-md", isHighContrast ? "text-yellow-300" : "text-white")}>Live OCR</h1>
                <div className={clsx(
                    "flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mt-1 backdrop-blur-md",
                    isHighContrast ? "bg-yellow-300 text-black" : "bg-black/50 text-white border border-white/20"
                )}>
                    {sessionStatus === 'Connecting' && <Loader2 className="w-3 h-3 animate-spin" />}
                    {sessionStatus === 'Live' && !isFrozen && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                    {isFrozen && <Snowflake className="w-3 h-3" />}
                    {getStatusText()}
                </div>
            </div>

            <button 
                onClick={() => toggleFlash()}
                className={clsx(
                    "p-3 rounded-full backdrop-blur-md transition-all active:scale-95",
                    flashOn 
                        ? (isHighContrast ? "bg-yellow-300 text-black" : "bg-white text-yellow-600")
                        : "bg-black/40 text-white hover:bg-white/20"
                )}
                aria-label={`Toggle Flashlight ${flashOn ? 'On' : 'Off'}`}
            >
                {flashOn ? <Zap className="w-6 h-6 fill-current" /> : <ZapOff className="w-6 h-6" />}
            </button>
        </header>

        {/* TRANSCRIPT AREA */}
        <div 
            className="absolute top-24 bottom-[140px] left-0 right-0 overflow-y-auto px-4 z-20 space-y-3 scroll-smooth py-4"
            role="log"
            aria-live="polite"
        >
            {transcript.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-60 text-center px-8">
                    <p className={clsx("text-sm font-medium", isHighContrast ? "text-yellow-100" : "text-white")}>
                        Tap "Auto-Read" to start scanning automatically, or use the camera button to freeze frame.
                    </p>
                </div>
            )}
            {transcript.map((msg, idx) => (
                <div key={idx} className={clsx("flex w-full animate-in slide-in-from-bottom-2 fade-in duration-300", msg.isUser ? "justify-end" : "justify-start")}>
                    <div className={clsx(
                        "max-w-[85%] p-3 rounded-2xl text-base font-medium shadow-md leading-relaxed",
                        msg.isUser 
                            ? (isHighContrast ? "bg-yellow-900 text-yellow-100 border border-yellow-500 rounded-br-none" : "bg-white/20 text-white backdrop-blur-md rounded-br-none")
                            : (isHighContrast ? "bg-yellow-300 text-black border-2 border-white rounded-bl-none font-bold" : "bg-black/60 text-white backdrop-blur-md border border-white/20 rounded-bl-none")
                    )}>
                        {msg.text}
                    </div>
                </div>
            ))}
            <div ref={transcriptEndRef} />
        </div>

        {/* CONTEXTUAL ACTIONS (Floating above controls) */}
        <div className="absolute bottom-[110px] right-4 z-30 flex flex-col gap-3 items-end pointer-events-none">
            {detectedPhone && (
                <button 
                    onClick={handleCall}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-xl active:scale-95 transition-all border-2 pointer-events-auto animate-in slide-in-from-right",
                        isHighContrast 
                            ? "bg-yellow-300 text-black border-white"
                            : "bg-green-500 text-white border-green-400"
                    )}
                >
                    <Phone className="w-5 h-5 fill-current" /> Call Number
                </button>
            )}
            {detectedAddress && (
                <button 
                    onClick={handleMap}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-xl active:scale-95 transition-all border-2 pointer-events-auto animate-in slide-in-from-right",
                        isHighContrast 
                            ? "bg-yellow-300 text-black border-white"
                            : "bg-blue-500 text-white border-blue-400"
                    )}
                >
                    <MapPin className="w-5 h-5 fill-current" /> Open Map
                </button>
            )}
        </div>

        {/* BOTTOM CONTROL BAR */}
        <div className={clsx(
            "absolute bottom-0 left-0 right-0 z-30 p-4 pb-safe flex items-center justify-between gap-2 shadow-2xl",
            isHighContrast 
                ? "bg-black border-t-4 border-yellow-300" 
                : "bg-black/90 backdrop-blur-xl border-t border-gray-800"
        )}>
            {/* Left Group: Controls */}
            <div className="flex gap-2">
                <ControlButton 
                    icon={autoReadEnabled ? <Mic className="w-6 h-6 fill-current" /> : <MicOff className="w-6 h-6" />}
                    label="Auto-Read"
                    active={autoReadEnabled}
                    onClick={toggleAutoRead}
                />
                
                <ControlButton 
                    icon={isFrozen ? <Play className="w-6 h-6 fill-current" /> : <Pause className="w-6 h-6 fill-current" />}
                    label={isFrozen ? "Resume" : "Freeze"}
                    active={isFrozen}
                    onClick={handleFreeze}
                    disabled={!isSessionActive && !isFrozen} // Disable freeze if not live yet
                />

                <ControlButton 
                    icon={<RotateCcw className="w-6 h-6" />}
                    label="Repeat"
                    onClick={handleRepeat}
                    disabled={!lastOcrText}
                />
            </div>

            {/* Center: Visualizer */}
            <div className="flex-1 flex justify-center">
                <Waveform level={liveVolume} active={isSessionActive && !isFrozen} colorMode={settings.colorMode} />
            </div>

            {/* Right Group: Save */}
            <div>
                <ControlButton 
                    icon={<Save className="w-6 h-6 fill-current" />}
                    label="Save"
                    onClick={handleSaveClick}
                    disabled={transcript.length === 0}
                />
            </div>
        </div>

        {/* SAVE MODAL */}
        {showSaveModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in">
                <form onSubmit={confirmSave} className={clsx(
                    "w-full max-w-sm p-6 rounded-2xl shadow-2xl border-2 space-y-4",
                    isHighContrast 
                        ? "bg-black border-yellow-300 text-yellow-300"
                        : "bg-white dark:bg-gray-900 border-transparent dark:border-gray-700"
                )}>
                    <div className="flex justify-between items-center">
                        <h3 className={clsx("text-xl font-bold", isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white")}>Save Capture</h3>
                        <button type="button" onClick={() => setShowSaveModal(false)} className="p-1">
                            <X className={clsx("w-6 h-6", isHighContrast ? "text-yellow-300" : "text-gray-500")} />
                        </button>
                    </div>
                    
                    <div>
                        <label htmlFor="docTitle" className="block text-sm font-medium opacity-70 mb-1">Document Title</label>
                        <input 
                            id="docTitle"
                            type="text" 
                            value={saveTitle}
                            onChange={e => setSaveTitle(e.target.value)}
                            className={clsx(
                                "w-full p-3 rounded-xl border outline-none font-bold text-lg",
                                isHighContrast 
                                    ? "bg-black border-yellow-300 text-yellow-300 focus:ring-2 focus:ring-yellow-500"
                                    : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            )}
                            autoFocus
                        />
                    </div>

                    <Button 
                        label="Save Document" 
                        type="submit" 
                        colorMode={settings.colorMode}
                        className="w-full py-4 text-lg font-bold"
                        icon={<Check className="w-5 h-5" />}
                    />
                </form>
            </div>
        )}
    </div>
  );
};
