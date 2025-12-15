
import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Download, Headphones } from 'lucide-react';
import clsx from 'clsx';
import { ColorMode, AppSettings } from '../types';
import { triggerHaptic } from '../services/hapticService';

interface PodcastPlayerProps {
    audioBlob: Blob;
    onClose: () => void;
    onExport: () => void;
    settings: AppSettings;
}

export const PodcastPlayer: React.FC<PodcastPlayerProps> = ({ audioBlob, onClose, onExport, settings }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

    const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

    useEffect(() => {
        if (audioRef.current && audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            audioRef.current.src = url;
            audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.warn("Auto-play blocked", e));
            return () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [audioBlob]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        triggerHaptic('medium');
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (offset: number) => {
        if (!audioRef.current) return;
        triggerHaptic('light');
        const newTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + offset));
        audioRef.current.currentTime = newTime;
    };

    const handleSpeedChange = () => {
        if (!audioRef.current) return;
        triggerHaptic('light');
        const speeds = [1.0, 1.25, 1.5, 2.0];
        const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
        const newSpeed = speeds[nextIdx];
        setPlaybackSpeed(newSpeed);
        audioRef.current.playbackRate = newSpeed;
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
            // Durations can be Infinity for streaming, check properly
            if (isFinite(audioRef.current.duration)) {
                setDuration(audioRef.current.duration);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={clsx(
            "sticky bottom-2 z-10 w-full p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 border-2",
            isHighContrast 
                ? "bg-black border-yellow-300 text-yellow-300" 
                : "bg-white dark:bg-gray-900 border-[#FFC107] dark:border-gray-700"
        )} role="region" aria-label="Podcast Player">
            
            <audio 
                ref={audioRef} 
                onTimeUpdate={handleTimeUpdate} 
                onEnded={() => setIsPlaying(false)}
                onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Headphones className="w-5 h-5 fill-current" />
                    <span className="font-bold text-sm tracking-wide">Podcast with Alex & Maya</span>
                </div>
                <button 
                    onClick={() => { triggerHaptic('light'); onClose(); }} 
                    className="p-2 -mr-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                    aria-label="Close Player"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-between gap-2 mb-4">
                <button 
                    onClick={() => handleSeek(-10)} 
                    className="p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-transform"
                    aria-label="Rewind 10 seconds"
                >
                    <SkipBack className="w-7 h-7" />
                </button>

                <button 
                    onClick={togglePlay} 
                    className={clsx(
                        "w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform",
                        isHighContrast ? "bg-yellow-300 text-black" : "bg-[#FFC107] text-black"
                    )}
                    aria-label={isPlaying ? "Pause Podcast" : "Play Podcast"}
                    aria-pressed={isPlaying}
                >
                    {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </button>

                <button 
                    onClick={() => handleSeek(10)} 
                    className="p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-transform"
                    aria-label="Fast Forward 10 seconds"
                >
                    <SkipForward className="w-7 h-7" />
                </button>
            </div>

            {/* Progress & Meta Controls */}
            <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold font-mono opacity-80" aria-hidden="true">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
                
                <input 
                    type="range" 
                    min="0" 
                    max={duration || 100} 
                    value={progress}
                    onChange={(e) => {
                        const val = Number(e.target.value);
                        if(audioRef.current) audioRef.current.currentTime = val;
                        setProgress(val);
                    }}
                    className={clsx(
                        "w-full h-2 rounded-lg appearance-none cursor-pointer",
                        isHighContrast ? "bg-gray-800 accent-yellow-300" : "bg-gray-200 dark:bg-gray-700 accent-[#FFC107]"
                    )}
                    aria-label="Seek Slider"
                    aria-valuemin={0}
                    aria-valuemax={duration}
                    aria-valuenow={progress}
                    aria-valuetext={`${Math.round((progress / duration) * 100)} percent`}
                />

                <div className="flex justify-between items-center pt-1">
                    <button 
                        onClick={handleSpeedChange} 
                        className="px-3 py-1.5 rounded-lg border-2 font-bold text-xs transition-colors active:scale-95"
                        aria-label={`Playback speed ${playbackSpeed}x`}
                    >
                        {playbackSpeed}x Speed
                    </button>
                    
                    <button 
                        onClick={() => { triggerHaptic('medium'); onExport(); }} 
                        className={clsx(
                            "px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors active:scale-95",
                            isHighContrast ? "bg-yellow-300 text-black" : "bg-black/5 dark:bg-white/10"
                        )}
                        aria-label="Save Podcast to Downloads"
                    >
                        <Download className="w-4 h-4" /> Save MP3
                    </button>
                </div>
            </div>
        </div>
    );
};
