
import React, { useState } from 'react';
import { ChevronLeft, MessageSquare, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
import clsx from 'clsx';
import { triggerHaptic } from '../services/hapticService';

interface DocumentControlsProps {
    settings: AppSettings;
    onPrevPage: () => void;
    onNextPage: () => void;
    canPrevPage: boolean;
    canNextPage: boolean;
    onAskPineX: () => void;
    onMoreOptions: () => void;
}

export const DocumentControls: React.FC<DocumentControlsProps> = ({
    settings,
    onPrevPage,
    onNextPage,
    canPrevPage,
    canNextPage,
    onAskPineX,
    onMoreOptions,
}) => {
    const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

    return (
        <div className={clsx(
            "fixed bottom-0 left-0 right-0 flex items-center justify-around z-20 h-[80px] pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-colors",
            isHighContrast
                ? "bg-black border-t-2 border-yellow-300"
                : "bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
        )}>
            {/* Prev Page */}
            <Button
                colorMode={settings.colorMode}
                label="Previous Page"
                variant="ghost"
                onClick={() => { triggerHaptic('light'); onPrevPage(); }}
                disabled={!canPrevPage}
                icon={<ChevronLeft className="w-8 h-8" />}
                className="w-1/4 h-full p-0 flex flex-col justify-center items-center rounded-none"
            />

            {/* Ask Pine-X */}
            <Button
                colorMode={settings.colorMode}
                label="Ask Pine-X"
                variant="ghost"
                onClick={() => { triggerHaptic('light'); onAskPineX(); }}
                icon={<MessageSquare className="w-6 h-6" />}
                className="w-1/4 h-full p-0 flex flex-col justify-center items-center font-medium rounded-none"
            >
                <span className="text-xs mt-1 font-bold">Pine-X</span>
            </Button>

            {/* Next Page */}
            <Button
                colorMode={settings.colorMode}
                label="Next Page"
                variant="ghost"
                onClick={() => { triggerHaptic('light'); onNextPage(); }}
                disabled={!canNextPage}
                icon={<ChevronRight className="w-8 h-8" />}
                className="w-1/4 h-full p-0 flex flex-col justify-center items-center rounded-none"
            />

            {/* More Options */}
            <Button
                colorMode={settings.colorMode}
                label="More Options"
                variant="ghost"
                onClick={onMoreOptions}
                icon={<MoreHorizontal className="w-8 h-8" />}
                className="w-1/4 h-full p-0 flex flex-col justify-center items-center rounded-none"
            />
        </div>
    );
};
