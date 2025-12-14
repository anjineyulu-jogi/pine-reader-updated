
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button';
import { ColorMode, AppSettings } from '../types';
import clsx from 'clsx';
import { PineappleLogo } from './ui/PineappleLogo';
import { ChevronRight, Check, BookOpen, ChevronsDown, MessageSquareText, MoreHorizontal, SkipForward } from 'lucide-react';
import { triggerHaptic } from '../services/hapticService';
import { LegalView } from './LegalView';

interface OnboardingTourProps {
    onComplete: () => void;
    settings: AppSettings;
    onSetConsent: (agreed: boolean) => void;
    hasAgreedToTerms: boolean;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, settings, onSetConsent, hasAgreedToTerms }) => {
    const [step, setStep] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showLegalOverlay, setShowLegalOverlay] = useState<'Privacy' | 'T&C' | null>(null);

    const steps = [
        {
            title: "Uncompromised Reading",
            text: "Pine Reader ensures perfect visual layout and full screen reader accessibility for every file type (PDF, DOCX, TXT).",
            icon: <BookOpen className="w-20 h-20 mb-2 drop-shadow-md text-blue-500 dark:text-blue-400" />
        },
        {
            title: "New Control Bar Navigation",
            text: "All document controls (Prev/Next Page, Jump To) are now fixed at the bottom for easy, one-handed navigation.",
            icon: <ChevronsDown className="w-20 h-20 mb-2 drop-shadow-md text-green-500 dark:text-green-400" />
        },
        {
            title: "Pine-X: Your AI Assistant",
            text: "Tap the floating pineapple button (bottom right) to open the Pine-X chat, ask questions about your document, or get instant summaries.",
            icon: <MessageSquareText className="w-20 h-20 mb-2 drop-shadow-md text-yellow-500" />
        },
        {
            title: "Expanded Options Menu",
            text: "Tap 'More' on the bottom bar to access secondary tools like Night Mode, Reflow Text, and Bookmarks.",
            icon: <MoreHorizontal className="w-20 h-20 mb-2 drop-shadow-md text-purple-500 dark:text-purple-400" />
        },
        {
            title: "High-Quality TTS Player",
            text: "When you start 'Read Aloud,' the bottom bar transforms into the TTS Player. This includes Play/Pause, Fast Forward/Rewind (10s), and accessible table reading.",
            icon: <SkipForward className="w-20 h-20 mb-2 drop-shadow-md text-red-500 dark:text-red-400" />
        },
        {
            title: "Ready to Read",
            text: "The crown stays on. 🍍\n\nI am Pine-X, your intelligent reading assistant. I can read documents aloud, answer questions, and help you navigate.",
            icon: <PineappleLogo className="w-20 h-20 mb-2 drop-shadow-md" />
        }
    ];

    useEffect(() => {
        // Focus container for screen readers when step changes
        if (containerRef.current) {
            containerRef.current.focus();
        }
    }, [step]);

    const handleNext = () => {
        triggerHaptic('medium');
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            // Final step validation
            if (!hasAgreedToTerms) {
                return;
            }
            onComplete();
        }
    };

    const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;
    const isLastStep = step === steps.length - 1;

    // Helper to render icon with correct high contrast override
    const renderIcon = (iconNode: React.ReactNode) => {
        if (isHighContrast) {
            return React.cloneElement(iconNode as React.ReactElement, { className: "w-20 h-20 mb-2 drop-shadow-md text-yellow-300" });
        }
        return iconNode;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <div 
                ref={containerRef}
                tabIndex={0}
                role="dialog"
                aria-label={isLastStep ? "Final Step: Consent and Start" : `${steps[step].title}. ${steps[step].text}`}
                className={clsx(
                    "w-full max-w-md p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-300 border-2",
                    isHighContrast 
                        ? "bg-black border-yellow-300 text-yellow-300" 
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                )}
            >
                {renderIcon(steps[step].icon)}
                
                <h2 className="text-2xl font-bold">{steps[step].title}</h2>
                <p className="text-lg leading-relaxed opacity-90 whitespace-pre-line">{steps[step].text}</p>
                
                {/* Dots Indicator */}
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

                {/* Consent Checkbox (Only on last step) */}
                {isLastStep && (
                    <div className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left">
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center space-x-3 cursor-pointer p-1">
                                <input
                                    type="checkbox"
                                    checked={hasAgreedToTerms}
                                    onChange={(e) => {
                                        triggerHaptic('light');
                                        onSetConsent(e.target.checked);
                                    }}
                                    className={clsx(
                                        "w-6 h-6 rounded focus:ring-2 shrink-0",
                                        isHighContrast ? "accent-yellow-300 text-black" : "text-blue-600 focus:ring-blue-500"
                                    )}
                                />
                                <span className="font-medium text-base">I agree to the terms below.</span>
                            </label>
                            
                            {/* Explicit Buttons outside the label to prevent click conflicts */}
                            {/* Added 'relative' to ensure z-index works correctly */}
                            <div className="flex flex-wrap items-center gap-x-1 text-sm pl-9">
                                <span className="opacity-80">Read our</span>
                                <button 
                                    type="button"
                                    onClick={(e) => { 
                                        e.preventDefault(); 
                                        e.stopPropagation(); 
                                        setShowLegalOverlay('Privacy'); 
                                    }}
                                    className={clsx("font-bold hover:underline relative z-20 p-1 rounded focus:outline-none focus:ring-2", isHighContrast ? "text-yellow-300 focus:ring-yellow-300" : "text-blue-600 dark:text-blue-400")}
                                >
                                    Privacy Policy
                                </button> 
                                <span className="opacity-80">and</span>
                                <button 
                                    type="button"
                                    onClick={(e) => { 
                                        e.preventDefault(); 
                                        e.stopPropagation(); 
                                        setShowLegalOverlay('T&C'); 
                                    }}
                                    className={clsx("font-bold hover:underline relative z-20 p-1 rounded focus:outline-none focus:ring-2", isHighContrast ? "text-yellow-300 focus:ring-yellow-300" : "text-blue-600 dark:text-blue-400")}
                                >
                                    Terms & Conditions
                                </button>.
                            </div>
                        </div>
                    </div>
                )}

                <Button 
                    label={isLastStep ? "Start Reading" : "Next"}
                    onClick={handleNext}
                    colorMode={settings.colorMode}
                    disabled={isLastStep && !hasAgreedToTerms}
                    className={clsx(
                        "w-full py-4 text-lg font-bold mt-2 transition-all",
                        isHighContrast 
                            ? "!bg-yellow-300 !text-black disabled:opacity-50 disabled:cursor-not-allowed" 
                            : "!bg-[#FFC107] !text-black disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    )}
                    icon={isLastStep ? <Check className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                />
            </div>

            {/* Legal Overlay Modal */}
            {showLegalOverlay && (
                <LegalView 
                    documentType={showLegalOverlay}
                    onClose={() => setShowLegalOverlay(null)}
                />
            )}
        </div>
    );
};
