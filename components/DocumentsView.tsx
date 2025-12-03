
import React from 'react';
import { Upload, FileText, History, FileSpreadsheet, File as FileIcon, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/Button';
import { ColorMode, AppSettings } from '../types';
import { StoredFileMetadata } from '../services/storageService';
import clsx from 'clsx';
import { UI_CLASSES } from '../constants';

interface DocumentsViewProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResumeFile: (fileId: string) => void;
  recentFiles: StoredFileMetadata[];
  settings: AppSettings;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ onFileUpload, onResumeFile, recentFiles, settings }) => {
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  const getFileIcon = (fileName: string, type: string) => {
      const name = fileName.toLowerCase();
      if (name.endsWith('.pdf')) return <FileText className="w-6 h-6 text-red-500" />;
      if (name.endsWith('.docx')) return <FileText className="w-6 h-6 text-blue-500" />;
      if (name.endsWith('.xlsx') || name.endsWith('.xls')) return <FileSpreadsheet className="w-6 h-6 text-green-500" />;
      if (type.startsWith('image/')) return <ImageIcon className="w-6 h-6 text-purple-500" />;
      return <FileIcon className="w-6 h-6 text-gray-500" />;
  };

  const formatDate = (ms: number) => {
      return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatSize = (bytes: number) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex-1 flex flex-col p-6 animate-in fade-in duration-300 pb-24 overflow-y-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Documents</h2>
        <p className="opacity-80">Open a PDF, DOCX, XLSX, Text file, or Image to start reading with AI enhancement.</p>
      </header>

      <div className="space-y-8 max-w-2xl mx-auto w-full">
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
                <p className="opacity-70 text-sm">Select PDF, Word, Excel, Text, or Image</p>
            </div>

            <label className={clsx("cursor-pointer w-full max-w-xs", UI_CLASSES.buttonPrimary)}>
                <input 
                    type="file" 
                    onChange={onFileUpload} 
                    accept=".pdf,.txt,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,image/*" 
                    className="hidden" 
                />
                <span className="flex items-center justify-center gap-2 text-lg py-1">
                    Select File
                </span>
            </label>
        </div>

        {/* Recent Files List */}
        {recentFiles.length > 0 && (
            <div className={clsx(
                "rounded-xl border transition-colors overflow-hidden",
                isHighContrast 
                    ? "border-yellow-300 bg-black" 
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
            )}>
                <div className="p-4 border-b border-inherit bg-gray-50 dark:bg-gray-700/30">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <History className="w-5 h-5" /> Recently Opened
                    </h3>
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {recentFiles.map((file) => (
                        <button
                            key={file.id}
                            onClick={() => onResumeFile(file.id)}
                            className={clsx(
                                "w-full text-left p-4 flex items-center gap-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-inset",
                                isHighContrast && "hover:bg-yellow-900/30 focus:ring-yellow-300"
                            )}
                            aria-label={`Resume reading ${file.name}, opened ${formatDate(file.lastOpened)}`}
                        >
                            <div className="shrink-0">
                                {getFileIcon(file.name, file.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={clsx("font-medium truncate", isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-gray-100")}>
                                    {file.name}
                                </p>
                                <p className="text-xs opacity-60 flex gap-2">
                                    <span>{formatDate(file.lastOpened)}</span>
                                    <span>•</span>
                                    <span>{formatSize(file.size)}</span>
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
