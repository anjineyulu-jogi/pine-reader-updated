
import React, { useEffect, useState } from 'react';
import { Bookmark as BookmarkIcon, Trash2, ChevronLeft, Share } from 'lucide-react';
import { Bookmark, AppSettings, ColorMode } from '../types';
import { getBookmarks, deleteBookmark } from '../services/storageService';
import clsx from 'clsx';
import { Button } from './ui/Button';
import { triggerHaptic } from '../services/hapticService';
import { PineappleLogo } from './ui/PineappleLogo';

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
      await deleteBookmark(id);
      loadBookmarks();
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
    <div className="flex-1 flex flex-col p-6 animate-in fade-in duration-300 pb-24 overflow-y-auto">
      <header className="mb-8 flex items-center justify-between gap-3">
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
                <p className="opacity-80 text-sm">Quickly jump to your saved sections.</p>
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
          <div className="text-center py-20 opacity-50">
              <BookmarkIcon className="w-16 h-16 mx-auto mb-4" />
              <p className="text-xl font-medium">No bookmarks yet</p>
              <p className="mt-2">Long-press on any heading or text while reading to save it here.</p>
          </div>
      ) : (
          <div className="space-y-4 max-w-2xl mx-auto w-full">
              {bookmarks.map((bm) => (
                  <button
                      key={bm.id}
                      onClick={() => handleOpen(bm)}
                      className={clsx(
                          "w-full text-left p-4 rounded-xl border flex gap-4 transition-all focus:outline-none focus:ring-4 relative group",
                          isHighContrast 
                            ? "bg-black border-yellow-300 text-yellow-300 focus:ring-yellow-600 hover:bg-yellow-900/30"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:ring-blue-200"
                      )}
                  >
                      <div className={clsx(
                          "shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg",
                          isHighContrast ? "bg-yellow-300 text-black" : "bg-yellow-100 text-yellow-700"
                      )}>
                          {bm.pageNumber}
                      </div>

                      <div className="flex-1 min-w-0">
                          <h3 className="font-bold truncate text-lg">{bm.text || "Bookmark"}</h3>
                          <div className="flex items-center gap-2 text-sm opacity-70 mt-1">
                              <span className="uppercase tracking-wider font-semibold text-xs border px-1 rounded border-current">
                                  {bm.type}
                              </span>
                              <span className="truncate">{bm.fileName}</span>
                              <span>•</span>
                              <span>{new Date(bm.timestamp).toLocaleDateString()}</span>
                          </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0 z-10">
                           <button 
                                onClick={(e) => handleDelete(e, bm.id)}
                                className={clsx(
                                    "p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors",
                                    isHighContrast ? "text-yellow-300 hover:text-white" : "text-gray-400 hover:text-red-600"
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
