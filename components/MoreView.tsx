
import React from 'react';
import { Camera, Globe, Bookmark, ArrowLeft } from 'lucide-react';
import { ColorMode, AppSettings, Tab } from '../types';
import clsx from 'clsx';
import { triggerHaptic } from '../services/hapticService';
import { Button } from './ui/Button';

interface MoreViewProps {
    onNavigate: (tab: Tab) => void;
    settings: AppSettings;
    onBack: () => void;
}

export const MoreView: React.FC<MoreViewProps> = ({ onNavigate, settings, onBack }) => {
    const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

    // The 3 specific tools requested for the "More" tab
    const tools = [
        {
            id: Tab.BOOKMARKS,
            label: "Bookmarks",
            description: "Saved pages",
            icon: <Bookmark className="w-12 h-12" />,
            color: "text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-200"
        },
        {
            id: Tab.WEB_READER,
            label: "Web Reader",
            description: "Read articles",
            icon: <Globe className="w-12 h-12" />,
            color: "text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-200"
        },
        {
            id: Tab.OCR,
            label: "Live OCR",
            description: "Scan text",
            icon: <Camera className="w-12 h-12" />,
            color: "text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200"
        }
    ];

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-300 pb-safe overflow-y-auto bg-gray-50 dark:bg-black h-full">
             {/* Header with Back Button */}
            <div className={clsx(
                "flex items-center p-4 border-b shrink-0 sticky top-0 z-10", 
                isHighContrast ? "border-yellow-300 bg-black" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151515]"
            )}>
                <Button
                    label="Back to Documents"
                    variant="ghost"
                    onClick={onBack}
                    colorMode={settings.colorMode}
                    className="p-1 -ml-2"
                    icon={<ArrowLeft className="w-6 h-6" />}
                />
                <h1 className={clsx("text-xl font-bold flex-1 text-center pr-8", isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white")}>More Features</h1> 
            </div>

            <div className="p-6 flex flex-col gap-6 max-w-lg mx-auto w-full flex-1 justify-center pb-24">
                {tools.map(tool => (
                    <button
                        key={tool.id}
                        onClick={() => {
                            triggerHaptic('medium');
                            onNavigate(tool.id);
                        }}
                        className={clsx(
                            "w-full flex flex-col items-center p-8 rounded-[2rem] transition-all active:scale-[0.98] shadow-sm",
                            isHighContrast
                                ? "bg-black border-4 border-yellow-300 text-yellow-300 hover:bg-yellow-900/20"
                                : "bg-white dark:bg-[#151515] border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:border-[#FFC107]/50"
                        )}
                        aria-label={`Open ${tool.label}. ${tool.description}`}
                    >
                        <div className={clsx(
                            "w-24 h-24 rounded-full flex items-center justify-center shrink-0 mb-4 transition-colors",
                            isHighContrast ? "bg-yellow-300 text-black border-4 border-white" : tool.color
                        )}>
                            {tool.icon}
                        </div>
                        
                        <div className="flex flex-col items-center">
                            <h3 className={clsx("text-2xl font-extrabold", isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white")}>
                                {tool.label}
                            </h3>
                            <p className={clsx("text-base font-medium opacity-80 mt-1 uppercase tracking-wide text-xs", isHighContrast ? "text-yellow-100" : "text-gray-500 dark:text-gray-400")}>
                                {tool.description}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
