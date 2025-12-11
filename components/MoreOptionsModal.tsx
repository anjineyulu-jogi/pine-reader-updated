import React from 'react';
import { Volume2, X, Bookmark, Share, Download, Settings } from 'lucide-react';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
import clsx from 'clsx';
import { triggerHaptic } from '../services/hapticService';

interface MoreOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onStartReadAloud: () => void;
    onOpenSettings: () => void;
    onSaveBookmark: () => void;
    onShare: () => void;
    onSaveAsPdf: () => void; 
}

export const MoreOptionsModal: React.FC<MoreOptionsModalProps> = ({
    isOpen,
    onClose,
    settings,
    onStartReadAloud,
    onOpenSettings,
    onSaveBookmark,
    onShare,
    onSaveAsPdf,
}) => {
    if (!isOpen) return null;

    const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

    return (
        <div 
            className="fixed inset-0 z-[60] bg-black/50 flex justify-center items-end"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="More Document Options"
        >
            <div 
                className={clsx(
                    "w-full max-w-lg p-6 rounded-t-3xl shadow-2xl transform transition-all duration-300 animate-in slide-in-from-bottom",
                    isHighContrast 
                        ? "bg-black border-t-4 border-yellow-300"
                        : "bg-white dark:bg-gray-900"
                )}
                onClick={(e) => e.stopPropagation()}
                role="menu"
            >
                <div className="flex justify-between items-center mb-6">
                     <h3 className={clsx("text-xl font-bold", isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white")}>Options</h3>
                     <Button 
                        label="Close Options"
                        variant="ghost"
                        colorMode={settings.colorMode}
                        onClick={onClose}
                        icon={<X className="w-6 h-6" />}
                    />
                </div>

                <div className="flex flex-col gap-3 pb-safe">
                    {/* Read Aloud (The key action to toggle the player) */}
                    <Button
                        label={`Read Aloud with ${settings.voiceName}`}
                        variant="primary"
                        colorMode={settings.colorMode}
                        onClick={() => {
                            triggerHaptic('medium');
                            onStartReadAloud();
                            onClose();
                        }}
                        icon={<Volume2 className="w-6 h-6" />}
                        className={clsx("py-5 text-lg font-bold mb-2", !isHighContrast && "shadow-lg")}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        {/* Bookmark */}
                        <Button
                            label="Bookmark"
                            variant="secondary"
                            colorMode={settings.colorMode}
                            onClick={() => { onSaveBookmark(); onClose(); }}
                            icon={<Bookmark className="w-5 h-5" />}
                            className="py-4 justify-start px-4"
                        >
                            Bookmark
                        </Button>

                        {/* Share */}
                        <Button
                            label="Share"
                            variant="secondary"
                            colorMode={settings.colorMode}
                            onClick={() => { onShare(); onClose(); }}
                            icon={<Share className="w-5 h-5" />}
                            className="py-4 justify-start px-4"
                        >
                            Share
                        </Button>

                        {/* Save as PDF */}
                        <Button
                            label="Save PDF"
                            variant="secondary"
                            colorMode={settings.colorMode}
                            onClick={() => { onSaveAsPdf(); onClose(); }}
                            icon={<Download className="w-5 h-5" />}
                            className="py-4 justify-start px-4"
                        >
                            Save PDF
                        </Button>
                        
                        {/* Settings */}
                        <Button
                            label="Settings"
                            variant="secondary"
                            colorMode={settings.colorMode}
                            onClick={() => { onOpenSettings(); onClose(); }}
                            icon={<Settings className="w-5 h-5" />}
                            className="py-4 justify-start px-4"
                        >
                            Settings
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};