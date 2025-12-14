
import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';

interface LegalViewProps {
    documentType: 'Privacy' | 'T&C';
    onClose: () => void;
}

const documentMap = {
    'Privacy': '/legal/PrivacyPolicy.html',
    'T&C': '/legal/TermsAndConditions.html',
};

export const LegalView: React.FC<LegalViewProps> = ({ documentType, onClose }) => {
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const filePath = documentMap[documentType];
        
        fetch(filePath)
            .then(res => {
                if (!res.ok) throw new Error("File not found");
                return res.text();
            })
            .then(html => {
                const cleanHtml = DOMPurify.sanitize(html); 
                setHtmlContent(cleanHtml);
            })
            .catch(error => {
                console.error(`Failed to load ${documentType} document:`, error);
                setHtmlContent(`<h1>Error Loading Document</h1><p>Could not load the ${documentType}. Please check your connection or contact support.</p>`);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [documentType]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="legal-title">
            <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full max-w-3xl h-full max-h-[90%] rounded-2xl shadow-2xl relative flex flex-col border border-gray-200 dark:border-gray-700">
                
                {/* Header */}
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
                    <h2 id="legal-title" className="text-xl font-bold">{documentType === 'Privacy' ? 'Privacy Policy' : 'Terms & Conditions'}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label={`Close ${documentType} document`}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div 
                            className="prose dark:prose-invert prose-sm sm:prose-base max-w-none" 
                            dangerouslySetInnerHTML={{ __html: htmlContent }} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
