
import React from 'react';
import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { ColorMode } from '../types';

interface AIDisclaimerProps {
    colorMode: ColorMode;
    className?: string;
}

export const AIDisclaimer: React.FC<AIDisclaimerProps> = ({ colorMode, className }) => {
    const themeClass = colorMode === ColorMode.HIGH_CONTRAST
        ? "bg-black text-yellow-300 border-yellow-300"
        : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800";

    return (
        <div 
            className={clsx(
                "w-full p-3 text-xs rounded-lg border flex items-start gap-2 mt-4",
                themeClass,
                className
            )}
            role="alert"
        >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="flex-1 font-medium leading-relaxed">
                <strong>Pine-X Caution:</strong> This assistant is powered by advanced AI and may generate inaccurate or misleading information. <strong>Always double-check critical details</strong> before relying on the output.
            </p>
        </div>
    );
};
