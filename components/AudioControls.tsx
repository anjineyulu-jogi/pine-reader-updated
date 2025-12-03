
import React from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
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
}) => {
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  return (
    <div className={clsx(
        "fixed bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none"
    )}>
        <div className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-full shadow-2xl pointer-events-auto border-2",
            isHighContrast 
                ? "bg-black border-yellow-300" 
                : "bg-white dark:bg-gray-900 border-blue-500/20"
        )}>
            {/* Previous Page */}
            <Button 
                colorMode={settings.colorMode} 
                label="Previous Page" 
                variant="ghost"
                onClick={onPrevPage}
                disabled={!canPrevPage}
                icon={<ChevronLeft className="w-6 h-6" />}
                className="rounded-full w-10 h-10 p-0"
            />

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

            {/* Rewind 10s */}
            <Button
                colorMode={settings.colorMode}
                label="Rewind 10 seconds"
                variant="ghost"
                onClick={onRewind}
                icon={<SkipBack className="w-6 h-6" />}
                className="rounded-full w-10 h-10 p-0"
            />

            {/* Play/Pause */}
            <Button
                colorMode={settings.colorMode}
                label={isPlaying ? "Pause" : "Play"}
                variant="primary"
                onClick={onTogglePlay}
                icon={isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                className={clsx(
                    "rounded-full w-14 h-14 p-0 shadow-lg mx-2 flex items-center justify-center",
                    isPlaying ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                )}
            />

            {/* Forward 10s */}
            <Button
                colorMode={settings.colorMode}
                label="Fast Forward 10 seconds"
                variant="ghost"
                onClick={onForward}
                icon={<SkipForward className="w-6 h-6" />}
                className="rounded-full w-10 h-10 p-0"
            />

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

            {/* Next Page */}
            <Button 
                colorMode={settings.colorMode} 
                label="Next Page" 
                variant="ghost"
                onClick={onNextPage}
                disabled={!canNextPage}
                icon={<ChevronRight className="w-6 h-6" />}
                className="rounded-full w-10 h-10 p-0"
            />
        </div>
    </div>
  );
};
