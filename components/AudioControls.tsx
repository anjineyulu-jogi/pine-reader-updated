import React from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
import clsx from 'clsx';

interface AudioControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRewind: () => void;
  onForward: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  canPrevPage: boolean;
  canNextPage: boolean;
  settings: AppSettings;
  onStop: () => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onRewind,
  onForward,
  onPrevPage,
  onNextPage,
  canPrevPage,
  canNextPage,
  settings,
  onStop,
}) => {
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  return (
    <div className={clsx(
        "fixed left-0 right-0 flex justify-center z-30 pointer-events-none",
        "bottom-6" 
    )}>
        <div className={clsx(
            "pointer-events-auto shadow-2xl rounded-full flex items-center p-2 gap-2 animate-in slide-in-from-bottom-10 duration-300",
            isHighContrast 
                ? "bg-black border-2 border-yellow-300 text-yellow-300" 
                : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
        )}>
            {/* Close / Stop */}
             <Button 
                colorMode={settings.colorMode} 
                label="Close Read Aloud" 
                variant="ghost"
                onClick={onStop} 
                icon={<X className="w-6 h-6 text-red-500" />}
                className="rounded-full w-12 h-12 p-0 mr-1 hover:bg-red-50 dark:hover:bg-red-900/20"
            />

            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" aria-hidden="true" />

            {/* Prev Page */}
            <Button 
                colorMode={settings.colorMode} 
                label="Previous Page" 
                variant="ghost"
                onClick={onPrevPage} 
                disabled={!canPrevPage}
                icon={<ChevronLeft className="w-6 h-6" />}
                className="rounded-full w-12 h-12 p-0"
            />

            {/* Rewind */}
            <Button 
                colorMode={settings.colorMode} 
                label="Rewind" 
                variant="ghost"
                onClick={onRewind} 
                icon={<SkipBack className="w-6 h-6" />}
                className="rounded-full w-12 h-12 p-0"
            />

            {/* Play/Pause */}
            <Button 
                colorMode={settings.colorMode} 
                label={isPlaying ? "Pause" : "Play"} 
                variant="primary" // Highlighted
                onClick={onTogglePlay} 
                icon={isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
                className={clsx(
                    "rounded-full w-16 h-16 p-0 flex items-center justify-center shadow-lg active:scale-95 transition-transform",
                    isHighContrast && "!bg-yellow-300 !text-black"
                )}
            />

            {/* Forward */}
            <Button 
                colorMode={settings.colorMode} 
                label="Forward" 
                variant="ghost"
                onClick={onForward} 
                icon={<SkipForward className="w-6 h-6" />}
                className="rounded-full w-12 h-12 p-0"
            />

             {/* Next Page */}
             <Button 
                colorMode={settings.colorMode} 
                label="Next Page" 
                variant="ghost"
                onClick={onNextPage} 
                disabled={!canNextPage}
                icon={<ChevronRight className="w-6 h-6" />}
                className="rounded-full w-12 h-12 p-0"
            />
        </div>
    </div>
  );
};