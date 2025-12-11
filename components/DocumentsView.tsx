
import React, { useState } from 'react';
import { Upload, FileText, History, FileSpreadsheet, File as FileIcon, Image as ImageIcon, ChevronRight, Search } from 'lucide-react';
import { ColorMode, AppSettings } from '../types';
import { StoredFileMetadata } from '../services/storageService';
import clsx from 'clsx';
import { PineappleLogo } from './ui/PineappleLogo';

interface DocumentsViewProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResumeFile: (fileId: string) => void;
  recentFiles: StoredFileMetadata[];
  settings: AppSettings;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ onFileUpload, onResumeFile, recentFiles, settings }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  const getFileIcon = (fileName: string, type: string) => {
      const name = fileName.toLowerCase();
      const iconClass = "w-8 h-8";
      if (name.endsWith('.pdf')) return <FileText className={clsx(iconClass, "text-red-600")} />;
      if (name.endsWith('.docx')) return <FileText className={clsx(iconClass, "text-blue-600")} />;
      if (name.endsWith('.xlsx') || name.endsWith('.xls')) return <FileSpreadsheet className={clsx(iconClass, "text-green-600")} />;
      if (type.startsWith('image/')) return <ImageIcon className={clsx(iconClass, "text-purple-600")} />;
      return <FileIcon className={clsx(iconClass, "text-gray-500")} />;
  };

  const formatDate = (ms: number) => {
      return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Filter Logic
  const filteredFiles = recentFiles.filter(file => 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-300 pb-32 overflow-y-auto bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className={clsx(
          "pt-12 pb-6 px-6 sticky top-0 z-10 border-b transition-colors",
          isHighContrast ? "bg-black border-yellow-300" : "bg-white/95 dark:bg-black/90 backdrop-blur-md border-gray-200 dark:border-gray-800"
      )}>
        <div className="flex items-center gap-4 max-w-2xl mx-auto mb-6">
            <PineappleLogo className="w-12 h-12 drop-shadow-md" />
            <div>
                <h2 className={clsx("text-3xl font-extrabold", isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-white")}>Documents</h2>
                <p className={clsx("text-sm font-medium opacity-70", isHighContrast ? "text-yellow-100" : "text-gray-500 dark:text-gray-400")}>
                    Read. Listen. Ask.
                </p>
            </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none opacity-50">
                <Search className={clsx("w-5 h-5", isHighContrast ? "text-yellow-300" : "text-gray-500")} />
            </div>
            <input 
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={clsx(
                    "w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all font-medium",
                    isHighContrast 
                        ? "bg-black border-yellow-300 text-yellow-300 placeholder-yellow-700 focus:ring-2 focus:ring-yellow-500" 
                        : "bg-gray-100 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-black focus:border-[#FFC107] text-gray-900 dark:text-white"
                )}
            />
        </div>
      </header>

      <div className="p-6 space-y-8 max-w-2xl mx-auto w-full">
        
        {/* Large Upload Button */}
        <div className="relative group">
            <input 
                type="file" 
                id="file-upload"
                onChange={onFileUpload} 
                accept=".pdf,.txt,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,image/*" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                aria-label="Upload a document to read"
            />
            <div className={clsx(
                "p-6 rounded-2xl border-2 border-dashed flex items-center gap-6 transition-all transform group-active:scale-[0.98]",
                isHighContrast 
                    ? "border-yellow-300 bg-black text-yellow-300 hover:bg-yellow-900/20" 
                    : "border-blue-400/50 bg-blue-50 dark:bg-blue-900/10 text-blue-900 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/20"
            )}>
                <div className={clsx(
                    "p-4 rounded-full shrink-0", 
                    isHighContrast ? "bg-yellow-300 text-black" : "bg-white dark:bg-blue-800 text-blue-600 dark:text-blue-200 shadow-sm"
                )}>
                    <Upload className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">Open New File</h3>
                    <p className="opacity-80 mt-1">PDF, Word, Excel, Text, Image</p>
                </div>
            </div>
        </div>

        {/* Recent Files Section */}
        {recentFiles.length > 0 && (
            <section aria-labelledby="recent-heading">
                <h3 id="recent-heading" className={clsx(
                    "text-lg font-bold mb-4 flex items-center gap-2",
                    isHighContrast ? "text-yellow-300" : "text-gray-700 dark:text-gray-300"
                )}>
                    <History className="w-5 h-5" /> Recent Files
                </h3>
                
                {filteredFiles.length === 0 ? (
                    <p className="text-center opacity-50 py-4">No files found matching "{searchQuery}"</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredFiles.map((file) => (
                            <button
                                key={file.id}
                                onClick={() => onResumeFile(file.id)}
                                className={clsx(
                                    "w-full text-left p-5 rounded-2xl flex items-center gap-4 transition-all shadow-sm active:scale-[0.98] border",
                                    isHighContrast 
                                        ? "bg-black border-white text-yellow-300 hover:bg-yellow-900/30" 
                                        : "bg-white dark:bg-[#1e1e1e] border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800"
                                )}
                                aria-label={`Open ${file.name}, last opened ${formatDate(file.lastOpened)}`}
                            >
                                <div className={clsx(
                                    "shrink-0 p-3 rounded-xl",
                                    isHighContrast ? "bg-yellow-300/20" : "bg-gray-100 dark:bg-gray-800"
                                )}>
                                    {getFileIcon(file.name, file.type)}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <p className={clsx(
                                        "font-bold text-lg truncate mb-1", 
                                        isHighContrast ? "text-yellow-300" : "text-gray-900 dark:text-gray-100"
                                    )}>
                                        {file.name}
                                    </p>
                                    <p className={clsx(
                                        "text-sm font-medium", 
                                        isHighContrast ? "text-yellow-100/70" : "text-gray-500 dark:text-gray-400"
                                    )}>
                                        {formatDate(file.lastOpened)}
                                    </p>
                                </div>

                                <ChevronRight className={clsx("w-6 h-6 opacity-50", isHighContrast ? "text-yellow-300" : "text-gray-400")} />
                            </button>
                        ))}
                    </div>
                )}
            </section>
        )}
      </div>
    </div>
  );
};
