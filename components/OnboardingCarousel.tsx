
import React, { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
import clsx from 'clsx';
import { PineappleLogo } from './ui/PineappleLogo';
import { MessageSquareText, Camera, Headphones, Sparkles, ChevronRight, HelpCircle } from 'lucide-react';
import { triggerHaptic } from '../services/hapticService';

interface OnboardingCarouselProps {
    onComplete: () => void;
    settings: AppSettings;
}

export const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({ onComplete, settings }) => {
    const [slide, setSlide] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

    const slides = [
        {
            title: "Welcome to Pine-Reader",
            subtitle: "Your AI Document Companion",
            desc: "The crown stays on! 🍍\nExperience uncompromised accessibility.",
            icon: <PineappleLogo className="w-32 h-32 drop-shadow-2xl animate-in zoom-in duration-500" />,
            color: "text-[#FFC107]"
        },
        {
            title: "Meet Pine-X",
            subtitle: "Intelligent Assistant",
            desc: "Your always-ready AI assistant. Chat with documents, control by voice, in English and Indic languages.",
            icon: <MessageSquareText className="w-32 h-32 text-blue-500 dark:text-blue-400 drop-shadow-2xl" />,
            color: "text-blue-500"
        },
        {
            title: "Live OCR Vision",
            subtitle: "See the World",
            desc: "Point your camera — Pine-X reads menus, labels, signs aloud in real-time, in Telugu, English and more.",
            icon: <Camera className="w-32 h-32 text-green-500 dark:text-green-400 drop-shadow-2xl" />,
            color: "text-green-500"
        },
        {
            title: "Podcast & Quiz",
            subtitle: "Listen & Learn",
            desc: "Turn any document into an engaging podcast with two AI hosts. Test your knowledge with interactive quizzes.",
            icon: <div className="flex gap-4"><Headphones className="w-24 h-24 text-purple-500" /><HelpCircle className="w-24 h-24 text-pink-500" /></div>,
            color: "text-purple-500"
        },
        {
            title: "You're All Set!",
            subtitle: "Ready to Read",
            desc: "High-contrast mode, large text, and full screen reader support enabled.",
            icon: <Sparkles className="w-32 h-32 text-yellow-500 drop-shadow-2xl animate-pulse" />,
            color: "text-yellow-500"
        }
    ];

    const nextSlide = () => {
        triggerHaptic('medium');
        if (slide < slides.length - 1) {
            setSlide(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    return (
        <div className={clsx(
            "fixed inset-0 z-[90] flex flex-col items-center justify-between p-6 overflow-hidden",
            isHighContrast ? "bg-black" : "bg-white dark:bg-black"
        )}>
            {/* Skip Button */}
            {slide < slides.length - 1 && (
                <button 
                    onClick={() => { triggerHaptic('light'); onComplete(); }}
                    className={clsx(
                        "absolute top-6 right-6 font-bold text-sm px-4 py-2 rounded-full transition-colors z-20",
                        isHighContrast ? "bg-yellow-300 text-black" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                    )}
                >
                    Skip
                </button>
            )}

            {/* Slide Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-md mx-auto space-y-8 animate-in slide-in-from-right duration-300 key={slide}">
                <div className="relative">
                    <div className={clsx("absolute inset-0 blur-3xl opacity-20 rounded-full scale-150", isHighContrast ? "bg-yellow-300" : "bg-current", slides[slide].color)} />
                    {slides[slide].icon}
                </div>

                <div className="space-y-4">
                    <h2 className={clsx(
                        "text-xs font-bold uppercase tracking-[0.2em]",
                        isHighContrast ? "text-yellow-300" : "text-gray-500"
                    )}>
                        {slides[slide].subtitle}
                    </h2>
                    <h1 className={clsx(
                        "text-4xl font-extrabold tracking-tight",
                        isHighContrast ? "text-white" : "text-gray-900 dark:text-white"
                    )}>
                        {slides[slide].title}
                    </h1>
                    <p className={clsx(
                        "text-lg font-medium leading-relaxed whitespace-pre-line px-4",
                        isHighContrast ? "text-yellow-100" : "text-gray-600 dark:text-gray-300"
                    )}>
                        {slides[slide].desc}
                    </p>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="w-full max-w-md space-y-8 mb-8">
                {/* Dots */}
                <div className="flex justify-center gap-3">
                    {slides.map((_, i) => (
                        <div 
                            key={i} 
                            className={clsx(
                                "h-2 rounded-full transition-all duration-300",
                                i === slide 
                                    ? (isHighContrast ? "w-8 bg-yellow-300" : "w-8 bg-black dark:bg-white") 
                                    : "w-2 bg-gray-300 dark:bg-gray-700"
                            )} 
                        />
                    ))}
                </div>

                <Button
                    label={slide === slides.length - 1 ? "Get Started" : "Next"}
                    onClick={nextSlide}
                    colorMode={settings.colorMode}
                    className={clsx(
                        "w-full py-5 text-xl font-bold rounded-2xl shadow-xl transition-transform active:scale-[0.98]",
                        isHighContrast 
                            ? "!bg-yellow-300 !text-black border-4 border-white" 
                            : "!bg-[#FFC107] !text-black hover:!bg-[#ffca2c]"
                    )}
                    icon={slide === slides.length - 1 ? <Sparkles className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                />
            </div>
        </div>
    );
};
