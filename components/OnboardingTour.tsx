
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button';
import { ColorMode, AppSettings } from '../types';
import clsx from 'clsx';
import { PineappleLogo } from './ui/PineappleLogo';
import { ChevronRight, Check } from 'lucide-react';
import { triggerHaptic } from '../services/hapticService';

interface OnboardingTourProps {
    onComplete: () => void;
    settings: AppSettings;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, settings }) => {
    const [step, setStep] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const steps = [
        {
            title: "Welcome to Pine Reader",
            text: "The crown stays on. 🍍\n\nI am Pine-X, your intelligent reading assistant. I can read documents aloud, answer questions, and help you navigate.",
        },
        {
            title: "Accessible by Design",
            text: "Navigate easily with tabs at the bottom. \n\nDouble-tap to stop reading. Double-tap with 3 fingers anywhere to ask 'Where am I?'. Long-press text to bookmark it.",
        },
        {
            title: "Ready to Read",
            text: "Open any PDF, Word, or Web page. \n\nTap 'Read' for lifelike voice, or ask me to summarize. Let's get started!",
        }
    ];

    useEffect(() => {
        // Announce step change for TalkBack
        if (containerRef.current) {
            containerRef.current.focus();
        }
    }, [step]);

    const handleNext = () => {
        triggerHaptic('medium');
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <div 
                ref={containerRef}
                tabIndex={0}
                role="dialog"
                aria-label={`${steps[step].title}. ${steps[step].text}`}
                className={clsx(
                    "w-full max-w-md p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-300 border-2",
                    isHighContrast 
                        ? "bg-black border-yellow-300 text-yellow-300" 
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                )}
            >
                <PineappleLogo className="w-20 h-20 mb-2 drop-shadow-md" />
                
                <h2 className="text-2xl font-bold">{steps[step].title}</h2>
                <p className="text-lg leading-relaxed opacity-90 whitespace-pre-line">{steps[step].text}</p>
                
                <div className="flex gap-2 mt-4">
                    {steps.map((_, i) => (
                        <div key={i} className={clsx(
                            "w-3 h-3 rounded-full transition-colors",
                            i === step 
                                ? (isHighContrast ? "bg-yellow-300" : "bg-[#FFC107]") 
                                : "bg-gray-300 dark:bg-gray-700"
                        )} />
                    ))}
                </div>

                <Button 
                    label={step === steps.length - 1 ? "Start Reading" : "Next"}
                    onClick={handleNext}
                    colorMode={settings.colorMode}
                    className={clsx(
                        "w-full py-4 text-lg font-bold mt-4",
                        isHighContrast ? "!bg-yellow-300 !text-black" : "!bg-[#FFC107] !text-black"
                    )}
                    icon={step === steps.length - 1 ? <Check className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                />
            </div>
        </div>
    );
};
