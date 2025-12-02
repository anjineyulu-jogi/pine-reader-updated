import React from 'react';
import { Upload, FileText, History, BookOpen } from 'lucide-react';
import { Button } from './ui/Button';
import { ColorMode, AppSettings } from '../types';
import clsx from 'clsx';
import { UI_CLASSES } from '../constants';

interface DocumentsViewProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResume: () => void;
  recentFile: { name: string } | null;
  settings: AppSettings;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ onFileUpload, onResume, recentFile, settings }) => {
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  return (
    <div className="flex-1 flex flex-col p-6 animate-in fade-in duration-300 pb-24">
      <header className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Documents</h2>
        <p className="opacity-80">Open a PDF or text file to start reading with AI enhancement.</p>
      </header>

      <div className="space-y-6 max-w-2xl mx-auto w-full">
        {/* Upload Card */}
        <div className={clsx(
            "p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-6 transition-colors text-center",
            isHighContrast 
                ? "border-yellow-300 bg-black text-yellow-300" 
                : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
        )}>
            <div className={clsx("p-4 rounded-full", isHighContrast ? "bg-yellow-300 text-black" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400")}>
                <Upload className="w-8 h-8" aria-hidden="true" />
            </div>
            
            <div className="space-y-2">
                <h3 className="text-xl font-bold">Upload Document</h3>
                <p className="opacity-70 text-sm">Select a PDF or TXT file from your device</p>
            </div>

            <label className={clsx("cursor-pointer w-full max-w-xs", UI_CLASSES.buttonPrimary)}>
                <input type="file" onChange={onFileUpload} accept=".pdf,.txt" className="hidden" />
                <span className="flex items-center justify-center gap-2 text-lg py-1">
                    Select File
                </span>
            </label>
        </div>

        {/* Recent Files */}
        {recentFile && (
            <div className={clsx(
                "p-6 rounded-xl border transition-colors",
                isHighContrast 
                    ? "border-yellow-300 bg-black" 
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
            )}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <History className="w-5 h-5" /> Recent
                    </h3>
                </div>
                
                <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="w-8 h-8 opacity-70 shrink-0" />
                        <span className="truncate font-medium">{recentFile.name}</span>
                    </div>
                    <Button
                        colorMode={settings.colorMode}
                        label="Resume"
                        onClick={onResume}
                        variant="secondary"
                        className="whitespace-nowrap"
                        icon={<BookOpen className="w-4 h-4" />}
                    />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};