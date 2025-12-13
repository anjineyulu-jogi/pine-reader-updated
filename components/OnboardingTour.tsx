
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button';
import { ColorMode, AppSettings } from '../types';
import clsx from 'clsx';
import { PineappleLogo } from './ui/PineappleLogo';
import { ChevronRight, Check } from 'lucide-react';
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
            // Final step validation
            if (!hasAgreedToTerms) {
                // Shake effect or visual feedback could be added here
                return;
            }
            onComplete();
        }
    };

    const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;
    const isLastStep = step === steps.length - 1;

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
                <PineappleLogo className="w-20 h-20 mb-2 drop-shadow-md" />
                
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
                    <div className="w-full text-left bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start gap-3">
                            <input
                                id="consent-check"
                                type="checkbox"
                                checked={hasAgreedToTerms}
                                onChange={(e) => {
                                    triggerHaptic('light');
                                    onSetConsent(e.target.checked);
                                }}
                                className={clsx(
                                    "mt-1 w-5 h-5 rounded focus:ring-2 shrink-0",
                                    isHighContrast ? "accent-yellow-300 text-black" : "text-blue-600 focus:ring-blue-500"
                                )}
                            />
                            <div className="text-sm leading-snug">
                                <label htmlFor="consent-check" className="cursor-pointer select-none">
                                    I have read and agree to the 
                                </label>
                                <button 
                                    type="button"
                                    onClick={(e) => { 
                                        e.preventDefault(); 
                                        e.stopPropagation(); 
                                        setShowLegalOverlay('Privacy'); 
                                    }}
                                    className={clsx("font-bold hover:underline mx-1 inline-block z-10 relative", isHighContrast ? "text-yellow-300" : "text-blue-600 dark:text-blue-400")}
                                >
                                    Privacy Policy
                                </button> 
                                and
                                <button 
                                    type="button"
                                    onClick={(e) => { 
                                        e.preventDefault(); 
                                        e.stopPropagation(); 
                                        setShowLegalOverlay('T&C'); 
                                    }}
                                    className={clsx("font-bold hover:underline ml-1 inline-block z-10 relative", isHighContrast ? "text-yellow-300" : "text-blue-600 dark:text-blue-400")}
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
