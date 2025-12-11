
import React, { useEffect, useState } from 'react';
import { Bookmark as BookmarkIcon, Trash2, ChevronLeft, Share } from 'lucide-react';
import { Bookmark, AppSettings, ColorMode } from '../types';
import { getBookmarks, deleteBookmark } from '../services/storageService';
import clsx from 'clsx';
import { Button } from './ui/Button';
import { triggerHaptic } from '../services/hapticService';

interface BookmarksViewProps {
  settings: AppSettings;
  onOpenBookmark: (fileId: string, pageNumber: number) => void;
  onBack?: () => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({ settings, onOpenBookmark, onBack }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    const list = await getBookmarks();
    setBookmarks(list);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      triggerHaptic('medium');
      // Optimistic update
      setBookmarks(prev => prev.filter(b => b.id !== id));
      await deleteBookmark(id);
  };

  const handleOpen = (bm: Bookmark) => {
      triggerHaptic('light');
      onOpenBookmark(bm.fileName, bm.pageNumber - 1); // 0-based index
  };

  const handleShareAll = async () => {
      if (bookmarks.length === 0) return;
      triggerHaptic('medium');
      
      const text = bookmarks.map(bm => 
          `• ${bm.text} (Page ${bm.pageNumber} in ${bm.fileName})`
      ).join('\n\n');

      const shareData = {
          title: 'My Pine Reader Bookmarks',
          text: `Here are my saved bookmarks:\n\n${text}\n\nShared via Pine Reader 🍍`
      };

      try {
          if (navigator.share) {
              await navigator.share(shareData);
          } else {
              await navigator.clipboard.writeText(shareData.text);
              alert("Bookmarks copied to clipboard!");
          }
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="flex-1 flex flex-col p-6 animate-in fade-in duration-300 pb-32 overflow-y-auto">
      <header className="mb-8 flex items-center justify-between gap-3 sticky top-0 z-10 py-4 -mx-6 px-6 backdrop-blur-md bg-inherit/90">
        <div className="flex items-center gap-3">
            {onBack && (
                <Button
                    label="Back"
                    onClick={onBack}
                    colorMode={settings.colorMode}
                    variant="secondary"
                    icon={<ChevronLeft className="w-5 h-5" />}
                    className="p-1.5 h-auto rounded-full mr-2"
                />
            )}
            <div className="flex flex-col">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                    <BookmarkIcon className="w-8 h-8 fill-current text-[#FFC107]" /> Bookmarks
                </h2>
                <p className="opacity-80 text-sm font-medium">Quickly jump to your saved sections.</p>
            </div>
        </div>
        
        {bookmarks.length > 0 && (
            <Button 
                label="Share All"
                onClick={handleShareAll}
                colorMode={settings.colorMode}
                variant="ghost"
                icon={<Share className={clsx("w-6 h-6", isHighContrast ? "text-yellow-300" : "text-gray-600 dark:text-gray-300")} />}
            />
        )}
      </header>

      {bookmarks.length === 0 ? (
          <div className="text-center py-20 opacity-50 flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <BookmarkIcon className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-xl font-bold">No bookmarks yet</p>
              <p className="mt-2 max-w-xs">Long-press on any heading or text while reading to save it here.</p>
          </div>
      ) : (
          <div className="space-y-4 max-w-2xl mx-auto w-full">
              {bookmarks.map((bm) => (
                  <button
                      key={bm.id}
                      onClick={() => handleOpen(bm)}
                      className={clsx(
                          "w-full text-left p-5 rounded-2xl border flex gap-4 transition-all-300 shadow-sm active:scale-[0.98] group relative overflow-hidden",
                          isHighContrast 
                            ? "bg-black border-yellow-300 text-yellow-300 focus:ring-yellow-600 hover:bg-yellow-900/30"
                            : "bg-white dark:bg-[#151515] border-gray-200 dark:border-gray-800 hover:border-[#FFC107]/50 dark:hover:border-[#FFC107]/50 hover:shadow-md hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
                      )}
                  >
                      <div className={clsx(
                          "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm transition-colors",
                          isHighContrast ? "bg-yellow-300 text-black" : "bg-[#FFC107]/10 text-gray-900 dark:text-gray-100 dark:bg-[#FFC107]/20"
                      )}>
                          {bm.pageNumber}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h3 className="font-bold truncate text-lg leading-tight mb-1">{bm.text || "Bookmark"}</h3>
                          <div className="flex items-center gap-2 text-sm opacity-70 font-medium">
                              <span className="uppercase tracking-wider text-[10px] border px-1.5 py-0.5 rounded border-current">
                                  {bm.type}
                              </span>
                              <span className="truncate max-w-[120px]">{bm.fileName}</span>
                              <span>•</span>
                              <span>{new Date(bm.timestamp).toLocaleDateString()}</span>
                          </div>
                      </div>

                      <div className="flex flex-col justify-center shrink-0 z-10 pl-2">
                           <button 
                                onClick={(e) => handleDelete(e, bm.id)}
                                className={clsx(
                                    "p-3 rounded-xl transition-all-300",
                                    isHighContrast 
                                        ? "text-yellow-300 hover:bg-yellow-300 hover:text-black" 
                                        : "text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                )}
                                aria-label="Delete bookmark"
                           >
                               <Trash2 className="w-5 h-5" />
                           </button>
                      </div>
                  </button>
              ))}
          </div>
      )}
    </div>
  );
};
