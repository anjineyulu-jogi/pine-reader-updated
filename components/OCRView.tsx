
import React, { useRef, useState, useEffect } from 'react';
import { Camera, ArrowLeft, Loader2, Maximize, FileText, Zap, RefreshCw, Mic, Square, PhoneOff } from 'lucide-react';
import { Button } from './ui/Button';
import { AppSettings, ColorMode, LiveConnection } from '../types';
import clsx from 'clsx';
import { triggerHaptic } from '../services/hapticService';
import { startLiveSession } from '../services/geminiService';
import { speakSystemMessage } from '../services/ttsService';
import { PineappleLogo } from './ui/PineappleLogo';

interface OCRViewProps {
  settings: AppSettings;
  onBack: () => void;
}

export const OCRView: React.FC<OCRViewProps> = ({ settings, onBack }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'Ready' | 'Connecting' | 'Live' | 'Error'>('Ready');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  
  // Live State
  const [transcript, setTranscript] = useState<{text: string, isUser: boolean}[]>([]);
  const [liveVolume, setLiveVolume] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const connectionRef = useRef<LiveConnection | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

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
                height: { ideal: 720 }
            } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
        // Announce readiness
        speakSystemMessage("Camera active. Tap the microphone button to start scanning.");
      } catch (err) {
        console.error("Camera error:", err);
        setHasPermission(false);
        speakSystemMessage("Camera permission denied.");
      }
    };
    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      stopSession(); // Cleanup session on unmount
    };
  }, [facingMode]);

  // Scroll transcript
  useEffect(() => {
      if (transcriptEndRef.current) {
          transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [transcript]);

  const toggleFlash = async () => {
      if (!videoRef.current || !videoRef.current.srcObject) return;
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      
      try {
          const capabilities = track.getCapabilities() as any;
          if (capabilities.torch) {
              await track.applyConstraints({ advanced: [{ torch: !flashOn }] } as any);
              setFlashOn(!flashOn);
              triggerHaptic('light');
          } else {
              speakSystemMessage("Flashlight not available.");
          }
      } catch (e) {
          console.error("Flash error", e);
      }
  };

  const startSession = async () => {
      triggerHaptic('medium');
      setSessionStatus('Connecting');
      speakSystemMessage("Connecting to Pine-X Live Vision.");

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
                      speakSystemMessage("Connection failed. Please try again.");
                      setTimeout(() => setSessionStatus('Ready'), 2000);
                  },
                  onAudioLevel: (level) => {
                      setLiveVolume(prev => prev * 0.7 + level * 0.3); // Smooth
                  },
                  onTranscript: (text, isUser) => {
                      setTranscript(prev => {
                          const last = prev[prev.length - 1];
                          // If same speaker, append text (simple debouncing/streaming logic)
                          if (last && last.isUser === isUser) {
                              // If text seems like a continuation (simplified check)
                              return [...prev.slice(0, -1), { text: last.text + " " + text, isUser }];
                          }
                          return [...prev, { text, isUser }];
                      });
                  }
              },
              settings.voiceName,
              "", // No extra text context needed, using system instruction
              true // Use Vision System Instruction
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
      
      // 1 FPS Capture Loop
      frameIntervalRef.current = window.setInterval(() => {
          if (videoRef.current && canvasRef.current) {
              const video = videoRef.current;
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              
              if (ctx && video.videoWidth > 0) {
                  // Draw scaled down frame for performance
                  const scale = 0.5; 
                  canvas.width = video.videoWidth * scale;
                  canvas.height = video.videoHeight * scale;
                  
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  
                  // Convert to JPEG base64 (no data prefix for API usually, but helper might handle)
                  // The helper expects raw base64 data string
                  const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                  connection.sendVideoFrame(base64);
              }
          }
      }, 1000); // 1 Frame per second
  };

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden">
        {/* Hidden Canvas for Processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Camera Feed */}
        <div className="absolute inset-0 z-0">
            {hasPermission === false ? (
                <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
                    <Camera className="w-16 h-16 opacity-50 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Camera Access Needed</h2>
                    <p>Please enable permissions to use Live Vision.</p>
                </div>
            ) : (
                <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                />
            )}
        </div>

        {/* Dark Overlay Gradient for Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none z-10" />

        {/* Header Controls */}
        <div className={clsx(
            "relative z-20 flex justify-between items-center p-4",
            isHighContrast ? "bg-black border-b border-yellow-300" : ""
        )}>
            <Button
                label="Back"
                onClick={() => { stopSession(); onBack(); }}
                variant="ghost"
                colorMode={settings.colorMode}
                className="text-white hover:bg-white/20 p-2"
                icon={<ArrowLeft className={clsx("w-8 h-8", isHighContrast && "text-yellow-300")} />}
            />
            
            <div className="flex gap-4">
                <button 
                    onClick={toggleFlash}
                    className="p-3 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-white/20 active:scale-95 transition-all"
                    aria-label="Toggle Flashlight"
                >
                    <Zap className={clsx("w-6 h-6", flashOn && "fill-current text-yellow-300")} />
                </button>
                <button 
                    onClick={() => {
                        triggerHaptic('light');
                        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
                    }}
                    className="p-3 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-white/20 active:scale-95 transition-all"
                    aria-label="Switch Camera"
                >
                    <RefreshCw className="w-6 h-6" />
                </button>
            </div>
        </div>

        {/* Status Indicator */}
        <div className="absolute top-20 left-0 right-0 z-20 flex justify-center pointer-events-none">
            {sessionStatus === 'Connecting' && (
                <div className={clsx(
                    "px-4 py-2 rounded-full flex items-center gap-2 animate-in slide-in-from-top fade-in",
                    isHighContrast ? "bg-yellow-300 text-black font-bold" : "bg-black/70 backdrop-blur text-white"
                )}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                </div>
            )}
            {sessionStatus === 'Live' && (
                <div className={clsx(
                    "px-4 py-2 rounded-full flex items-center gap-2 animate-pulse",
                    isHighContrast ? "bg-red-600 text-white font-bold border-2 border-yellow-300" : "bg-red-600/90 text-white shadow-lg"
                )}>
                    <div className="w-2 h-2 rounded-full bg-white" />
                    LIVE VISION
                </div>
            )}
        </div>

        {/* Main Content Area (Spacer) */}
        <div className="flex-1 z-10" />

        {/* Live Transcript Area */}
        {isSessionActive && (
            <div className={clsx(
                "relative z-20 max-h-[30vh] overflow-y-auto px-4 py-2 space-y-2 mask-linear-fade",
                isHighContrast ? "bg-black/90 border-t-2 border-yellow-300" : ""
            )}>
                {transcript.length === 0 ? (
                    <p className={clsx("text-center italic opacity-70", isHighContrast ? "text-yellow-100" : "text-white")}>
                        Pine-X is listening and watching...
                    </p>
                ) : (
                    transcript.map((msg, idx) => (
                        <div key={idx} className={clsx(
                            "p-2 rounded-lg text-sm font-medium",
                            msg.isUser 
                                ? (isHighContrast ? "bg-yellow-900 text-yellow-100 self-end ml-8" : "bg-white/10 text-white self-end ml-8")
                                : (isHighContrast ? "bg-yellow-300 text-black self-start mr-8" : "bg-blue-600/80 text-white self-start mr-8")
                        )}>
                            {msg.text}
                        </div>
                    ))
                )}
                <div ref={transcriptEndRef} />
            </div>
        )}

        {/* Bottom Controls */}
        <div className={clsx(
            "relative z-30 p-6 pb-safe flex flex-col items-center gap-6",
            isHighContrast ? "bg-black border-t-4 border-yellow-300" : "bg-gradient-to-t from-black via-black/80 to-transparent"
        )}>
            
            {/* Visualizer (Only when active) */}
            <div className="h-12 flex items-center justify-center gap-1 w-full">
                {isSessionActive ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div 
                            key={i}
                            className={clsx(
                                "w-3 rounded-full transition-all duration-75",
                                isHighContrast ? "bg-yellow-300" : "bg-blue-400"
                            )}
                            style={{ 
                                height: `${Math.max(10, Math.min(100, liveVolume * 150 * (Math.random() + 0.5)))}%`,
                                opacity: 0.8 
                            }}
                        />
                    ))
                ) : (
                    <p className={clsx("font-medium text-lg", isHighContrast ? "text-yellow-300" : "text-white/80")}>
                        Tap mic to start identifying
                    </p>
                )}
            </div>

            {/* Main Action Button */}
            <button
                onClick={isSessionActive ? stopSession : startSession}
                disabled={sessionStatus === 'Connecting'}
                className={clsx(
                    "w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 border-4 relative",
                    isSessionActive 
                        ? (isHighContrast ? "bg-red-600 border-yellow-300 text-white" : "bg-white border-red-500 text-red-600")
                        : (isHighContrast ? "bg-yellow-300 border-white text-black" : "bg-blue-600 border-white/20 text-white hover:bg-blue-500")
                )}
                aria-label={isSessionActive ? "Stop Live Vision" : "Start Live Vision"}
            >
                {/* Ping Animation when active */}
                {isSessionActive && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-red-500 opacity-20" />
                )}

                {sessionStatus === 'Connecting' ? (
                    <Loader2 className="w-10 h-10 animate-spin" />
                ) : isSessionActive ? (
                    <Square className="w-10 h-10 fill-current" />
                ) : (
                    <Mic className="w-10 h-10 fill-current" />
                )}
            </button>
            
            {/* Context/Hint */}
            <p className={clsx(
                "text-xs font-bold uppercase tracking-widest opacity-80",
                isHighContrast ? "text-yellow-300" : "text-white"
            )}>
                {isSessionActive ? "Listening & Watching" : "Ready to Scan"}
            </p>
        </div>
    </div>
  );
};
