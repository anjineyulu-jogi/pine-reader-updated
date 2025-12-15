
import React from 'react';
import { Camera, Globe, Bookmark, X, ChevronRight } from 'lucide-react';
import { ColorMode, AppSettings, Tab } from '../types';
import clsx from 'clsx';
import { Button } from './ui/Button';
import { triggerHaptic } from '../services/hapticService';

interface ToolsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (tab: Tab) => void;
    settings: AppSettings;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({ isOpen, onClose, onNavigate, settings }) => {
    const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

    if (!isOpen) return null;

    const tools = [
        {
            id: Tab.OCR,
            label: "Live OCR & Vision",
            description: "Scan menus, signs, and documents with your camera.",
            icon: <Camera className="w-8 h-8" />,
            color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
        },
        {
            id: Tab.WEB_READER,
            label: "Web Reader",
            description: "Read articles and web stories without clutter.",
            icon: <Globe className="w-8 h-8" />,
            color: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300"
        },
        {
            id: Tab.BOOKMARKS,
            label: "Bookmarks",
            description: "Access your saved pages and highlights.",
            icon: <Bookmark className="w-8 h-8" />,
            color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300"
        }
    ];

    const handleSelect = (tab: Tab) => {
        triggerHaptic('medium');
        onNavigate(tab);
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
            role="dialog"
            aria-label="Tools Menu"
        >
            <div 
                className={clsx(
                    "w-full max-w-lg p-6 rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-10 duration-300",
                    isHighContrast 
                        ? "bg-black border-4 border-yellow-300" 
                        : "bg-white dark:bg-gray-900"
                )}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className={clsx("text-2xl font-bold", isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white")}>
                        Tools
                    </h2>
                    <Button 
                        label="Close"
                        variant="ghost"
                        colorMode={settings.colorMode}
                        onClick={onClose}
                        icon={<X className="w-6 h-6" />}
                        className="rounded-full w-12 h-12 p-0"
                    />
                </div>

                <div className="space-y-4">
                    {tools.map(tool => (
                        <button
                            key={tool.id}
                            onClick={() => handleSelect(tool.id)}
                            className={clsx(
                                "w-full flex items-center p-4 rounded-3xl transition-all active:scale-[0.98] group text-left border-2",
                                isHighContrast
                                    ? "bg-black border-yellow-300 text-yellow-300 hover:bg-yellow-900/20"
                                    : "bg-gray-50 dark:bg-gray-800 border-transparent hover:border-[#FFC107] hover:shadow-md"
                            )}
                        >
                            <div className={clsx(
                                "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 mr-4",
                                isHighContrast ? "bg-yellow-300 text-black" : tool.color
                            )}>
                                {tool.icon}
                            </div>
                            
                            <div className="flex-1">
                                <h3 className={clsx("text-lg font-bold", isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white")}>
                                    {tool.label}
                                </h3>
                                <p className={clsx("text-sm font-medium opacity-80 leading-tight mt-1", isHighContrast ? "text-yellow-100" : "text-gray-500 dark:text-gray-400")}>
                                    {tool.description}
                                </p>
                            </div>

                            <ChevronRight className={clsx("w-6 h-6 opacity-50 group-hover:translate-x-1 transition-transform", isHighContrast && "text-yellow-300")} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
