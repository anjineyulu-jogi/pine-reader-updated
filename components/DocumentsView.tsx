
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
      const iconClass = "w-7 h-7"; // Refined size
      if (name.endsWith('.pdf')) return <FileText className={clsx(iconClass, "text-red-600")} />;
      if (name.endsWith('.docx')) return <FileText className={clsx(iconClass, "text-blue-600")} />;
      if (name.endsWith('.xlsx') || name.endsWith('.xls')) return <FileSpreadsheet className={clsx(iconClass, "text-green-600")} />;
      if (type.startsWith('image/')) return <ImageIcon className={clsx(iconClass, "text-purple-600")} />;
      return <FileIcon className={clsx(iconClass, "text-gray-500")} />;
  };

  const formatDate = (ms: number) => {
      return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

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
                    "w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all-300 font-medium",
                    isHighContrast 
                        ? "bg-black border-yellow-300 text-yellow-300 placeholder-yellow-700 focus:ring-2 focus:ring-yellow-500" 
                        : "bg-gray-100 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-black focus:border-[#FFC107] text-gray-900 dark:text-white focus:shadow-md"
                )}
            />
        </div>
      </header>

      <div className="p-6 space-y-8 max-w-2xl mx-auto w-full">
        
        {/* Large Upload Card */}
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
                "p-6 rounded-2xl border-2 border-dashed flex items-center gap-6 transition-all-300 transform group-active:scale-[0.98]",
                isHighContrast 
                    ? "border-yellow-300 bg-black text-yellow-300 hover:bg-yellow-900/20" 
                    : "border-[#FFC107]/50 bg-[#FFC107]/5 text-gray-800 dark:text-gray-100 hover:bg-[#FFC107]/10 hover:shadow-lg hover:border-[#FFC107] hover:scale-[1.01]"
            )}>
                <div className={clsx(
                    "p-4 rounded-full shrink-0 shadow-sm", 
                    isHighContrast ? "bg-yellow-300 text-black" : "bg-white dark:bg-gray-800 text-[#FFC107]"
                )}>
                    <Upload className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">Open New File</h3>
                    <p className="opacity-80 mt-1 font-medium">PDF, Word, Excel, Text, Image</p>
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
                                    "w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all-300 shadow-sm active:scale-[0.98] border group relative overflow-hidden",
                                    isHighContrast 
                                        ? "bg-black border-white text-yellow-300 hover:bg-yellow-900/30 hover:border-yellow-300" 
                                        : "bg-white dark:bg-[#151515] border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-[#FFC107]/50 dark:hover:border-[#FFC107]/50 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
                                )}
                                aria-label={`Open ${file.name}, last opened ${formatDate(file.lastOpened)}`}
                            >
                                <div className={clsx(
                                    "shrink-0 p-3 rounded-xl transition-colors",
                                    isHighContrast ? "bg-yellow-300/20" : "bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-black"
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

                                <ChevronRight className={clsx("w-6 h-6 opacity-50 transition-transform group-hover:translate-x-1", isHighContrast ? "text-yellow-300" : "text-gray-400")} />
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
