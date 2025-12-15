
import React, { useState, useRef, useEffect } from 'react';
import { Shield, FileText, Check, AlertTriangle, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import { AppSettings, ColorMode } from '../types';
import clsx from 'clsx';
import { triggerHaptic } from '../services/hapticService';
import { PineappleLogo } from './ui/PineappleLogo';

interface PrivacyAgreementModalProps {
    settings: AppSettings;
    onAgree: () => void;
}

export const PrivacyAgreementModal: React.FC<PrivacyAgreementModalProps> = ({ settings, onAgree }) => {
    const [activeTab, setActiveTab] = useState<'PRIVACY' | 'TERMS'>('PRIVACY');
    const [privacyScrolled, setPrivacyScrolled] = useState(false);
    const [termsScrolled, setTermsScrolled] = useState(false);
    const [showDeclineMsg, setShowDeclineMsg] = useState(false);

    const privacyRef = useRef<HTMLDivElement>(null);
    const termsRef = useRef<HTMLDivElement>(null);

    const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

    // Check if content fits without scrolling
    useEffect(() => {
        const checkScroll = (ref: React.RefObject<HTMLDivElement>, setScrolled: (v: boolean) => void) => {
            if (ref.current) {
                if (ref.current.scrollHeight <= ref.current.clientHeight + 50) {
                    setScrolled(true);
                }
            }
        };
        // Small delay to ensure render
        setTimeout(() => {
            checkScroll(privacyRef, setPrivacyScrolled);
            checkScroll(termsRef, setTermsScrolled);
        }, 500);
    }, [activeTab]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>, setter: (v: boolean) => void) => {
        const target = e.currentTarget;
        // Tolerance of 20px
        if (target.scrollHeight - target.scrollTop - target.clientHeight < 50) {
            setter(true);
        }
    };

    const handleDecline = () => {
        triggerHaptic('error');
        setShowDeclineMsg(true);
        setTimeout(() => setShowDeclineMsg(false), 3000);
    };

    const canAgree = privacyScrolled && termsScrolled;

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className={clsx(
                "w-full max-w-lg h-full max-h-[85vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border-2 relative",
                isHighContrast 
                    ? "bg-black border-yellow-300 text-yellow-300" 
                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
            )}>
                {/* Header */}
                <div className={clsx(
                    "p-6 text-center border-b shrink-0",
                    isHighContrast ? "border-yellow-300 bg-yellow-900/20" : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
                )}>
                    <PineappleLogo className="w-12 h-12 mx-auto mb-3 drop-shadow-md" />
                    <h1 className={clsx("text-2xl font-bold", isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white")}>
                        Welcome to Pine-Reader
                    </h1>
                    <p className="text-sm opacity-70 mt-1 font-medium">Please review our policies to continue.</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-inherit shrink-0">
                    <button
                        onClick={() => setActiveTab('PRIVACY')}
                        className={clsx(
                            "flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors relative",
                            activeTab === 'PRIVACY' 
                                ? (isHighContrast ? "bg-yellow-300 text-black" : "bg-white dark:bg-gray-900 text-blue-600 border-b-2 border-blue-600")
                                : "opacity-60 hover:opacity-100"
                        )}
                    >
                        Privacy Policy
                        {privacyScrolled && <Check className="w-4 h-4 absolute top-1 right-2 text-green-500" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('TERMS')}
                        className={clsx(
                            "flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors relative",
                            activeTab === 'TERMS'
                                ? (isHighContrast ? "bg-yellow-300 text-black" : "bg-white dark:bg-gray-900 text-blue-600 border-b-2 border-blue-600")
                                : "opacity-60 hover:opacity-100"
                        )}
                    >
                        Terms & Conditions
                        {termsScrolled && <Check className="w-4 h-4 absolute top-1 right-2 text-green-500" />}
                    </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 relative overflow-hidden bg-gray-50/50 dark:bg-black/20">
                    {/* Privacy Tab */}
                    <div 
                        ref={privacyRef}
                        onScroll={(e) => handleScroll(e, setPrivacyScrolled)}
                        className={clsx(
                            "absolute inset-0 p-6 overflow-y-auto space-y-4 scroll-smooth",
                            activeTab === 'PRIVACY' ? "block" : "hidden"
                        )}
                    >
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Shield className="w-5 h-5" /> Privacy Policy Summary
                        </h2>
                        <div className="prose prose-sm dark:prose-invert max-w-none opacity-90 leading-relaxed">
                            <p><strong>Last Updated: January 2026</strong></p>
                            <p>Pine Reader is designed to respect your privacy. Here is a summary of how we handle your data:</p>
                            <ul className="list-disc pl-4 space-y-2">
                                <li><strong>Local Storage:</strong> Your documents (PDF, DOCX, etc.) are processed and stored locally on your device. We do not upload your files to our servers for storage.</li>
                                <li><strong>AI Processing:</strong> To provide AI features (Pine-X, Summarization, OCR), text snippets are securely transmitted to the Google Gemini API. These snippets are not used to train Google's models.</li>
                                <li><strong>No Account Required:</strong> We do not collect your name, email, or phone number for the core reading functionality.</li>
                            </ul>
                            <p className="italic text-xs mt-4 border-t pt-2 border-dashed">
                                * Full versions of our Privacy Policy will be hosted on our website (the-pineapple.net) in the future. By continuing, you agree to this in-app summary.
                            </p>
                            <div className="h-10" /> {/* Spacer for scroll detection */}
                        </div>
                    </div>

                    {/* Terms Tab */}
                    <div 
                        ref={termsRef}
                        onScroll={(e) => handleScroll(e, setTermsScrolled)}
                        className={clsx(
                            "absolute inset-0 p-6 overflow-y-auto space-y-4 scroll-smooth",
                            activeTab === 'TERMS' ? "block" : "hidden"
                        )}
                    >
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5" /> Terms & Conditions
                        </h2>
                        <div className="prose prose-sm dark:prose-invert max-w-none opacity-90 leading-relaxed">
                            <p><strong>Last Updated: January 2026</strong></p>
                            <p>By using Pine Reader, you agree to the following terms:</p>
                            <ul className="list-disc pl-4 space-y-2">
                                <li><strong>Usage License:</strong> You are granted a limited, revocable license to use this app for personal, non-commercial purposes.</li>
                                <li><strong>AI Disclaimer:</strong> Pine-X is an AI assistant. Its outputs (summaries, answers) may be inaccurate. Do not rely on it for medical, legal, or financial advice.</li>
                                <li><strong>Content Ownership:</strong> You retain all rights to the documents you upload. You grant us permission to process them solely to provide the app's features.</li>
                            </ul>
                            <p className="italic text-xs mt-4 border-t pt-2 border-dashed">
                                * Full versions of our Terms & Conditions will be hosted on our website (the-pineapple.net) in the future. By continuing, you agree to this in-app summary.
                            </p>
                            <div className="h-10" /> {/* Spacer for scroll detection */}
                        </div>
                    </div>

                    {/* Scroll Hint */}
                    {((activeTab === 'PRIVACY' && !privacyScrolled) || (activeTab === 'TERMS' && !termsScrolled)) && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none animate-bounce">
                            <div className={clsx("p-2 rounded-full shadow-lg", isHighContrast ? "bg-yellow-300 text-black" : "bg-white dark:bg-gray-800")}>
                                <ChevronDown className="w-5 h-5" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className={clsx(
                    "p-4 border-t shrink-0 flex flex-col gap-3",
                    isHighContrast ? "border-yellow-300 bg-black" : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
                )}>
                    {showDeclineMsg && (
                        <div className="flex items-center gap-2 text-xs font-bold text-red-500 justify-center animate-in slide-in-from-bottom">
                            <AlertTriangle className="w-4 h-4" /> Agreement required to use the app
                        </div>
                    )}
                    
                    <div className="flex gap-3">
                        <Button 
                            label="Decline" 
                            variant="ghost" 
                            colorMode={settings.colorMode}
                            onClick={handleDecline}
                            className="flex-1 opacity-70 hover:opacity-100"
                        >
                            Decline
                        </Button>
                        <Button 
                            label={canAgree ? "I Agree" : "Read to Agree"}
                            variant="primary" 
                            colorMode={settings.colorMode}
                            onClick={() => {
                                if (canAgree) {
                                    triggerHaptic('success');
                                    onAgree();
                                } else {
                                    triggerHaptic('error');
                                    // Shake animation could go here
                                }
                            }}
                            disabled={!canAgree}
                            className={clsx(
                                "flex-[2] font-bold text-lg shadow-lg transition-all",
                                !canAgree && "opacity-50 grayscale cursor-not-allowed"
                            )}
                        >
                            {canAgree ? "I Agree" : "Scroll to Bottom"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
