import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { parsePDF, parseTextFile } from './services/pdfService';
import { transformTextToSemanticHtml } from './services/geminiService';
import { saveRecentFileToStorage, getRecentFileFromStorage, saveReadingProgress, getReadingProgress } from './services/storageService';
import { ParsedDocument, AppSettings, ColorMode, Tab } from './types';
import { DEFAULT_SETTINGS, THEME_CLASSES } from './constants';
import { Reader } from './components/Reader';
import { Button } from './components/ui/Button';
import { SettingsPanel } from './components/SettingsPanel';
import { PineX } from './components/ChatBot';
import { BottomNav } from './components/BottomNav';
import { DocumentsView } from './components/DocumentsView';

export default function App() {
  const [document, setDocument] = useState<ParsedDocument | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentFile, setRecentFile] = useState<{name: string} | null>(null);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DOCUMENTS);
  
  // Reader Overlay State (PineX in Reader Mode)
  const [showReaderChat, setShowReaderChat] = useState(false);

  // Wake Lock Hook
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && document) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        // Wake lock is optional, ignore errors
        console.debug('Wake Lock skipped');
      }
    };

    if (document) {
      requestWakeLock();
    }

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [document]); // Re-run when document opens/closes

  // Initial load check for recent files
  useEffect(() => {
    checkRecentFile();
  }, []);

  const checkRecentFile = async () => {
    const file = await getRecentFileFromStorage();
    if (file) {
        setRecentFile({ name: file.name });
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
        let parsed: ParsedDocument;
        if (file.type === 'application/pdf') {
            parsed = await parsePDF(file);
        } else {
            parsed = await parseTextFile(file);
        }

        // Save file & update state
        await saveRecentFileToStorage(file);
        setRecentFile({ name: file.name });

        // Restore progress
        const savedPage = getReadingProgress(file.name);
        const startPage = (savedPage >= 0 && savedPage < parsed.pages.length) ? savedPage : 0;

        setDocument(parsed);
        setCurrentPageIndex(startPage);

        // Auto-trigger AI for the starting page
        if (parsed.pages.length > 0) {
            enhancePage(parsed, startPage);
        }

    } catch (err) {
        console.error("Error opening file", err);
        // No speech, just silent fail or UI indicator if we added toast later
    } finally {
        setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleResumeClick = async () => {
      const file = await getRecentFileFromStorage();
      if (file) {
          await processFile(file);
      }
  };

  const handleCloseDocument = () => {
    setDocument(null);
    setShowReaderChat(false);
  };

  // Function to run Gemini on a specific page
  const enhancePage = async (doc: ParsedDocument, pageIndex: number) => {
      const page = doc.pages[pageIndex];
      // Only enhance if we haven't already
      if (!page.semanticHtml) {
          setIsProcessing(true);
          const html = await transformTextToSemanticHtml(page.text);
          
          setDocument(prev => {
              if (!prev) return null;
              const newPages = [...prev.pages];
              newPages[pageIndex] = { ...page, semanticHtml: html };
              return { ...prev, pages: newPages };
          });
          setIsProcessing(false);
      }
  };

  const changePage = async (delta: number) => {
      if (!document) return;
      const newIndex = currentPageIndex + delta;
      if (newIndex >= 0 && newIndex < document.pages.length) {
          setCurrentPageIndex(newIndex);
          saveReadingProgress(document.metadata.name, newIndex);
          enhancePage(document, newIndex);
      }
  };

  const currentPage = document?.pages[currentPageIndex];

  // Render Logic
  const isHighContrast = settings.colorMode === ColorMode.HIGH_CONTRAST;

  return (
    <div className={clsx("min-h-screen flex flex-col font-sans transition-colors duration-200", THEME_CLASSES[settings.colorMode])}>
      
      {/* 
          MODE 1: READER MODE 
          Active when a document is loaded. Bottom Nav is hidden. 
      */}
      {document ? (
        <>
          <header className={clsx(
              "px-4 py-3 border-b sticky top-0 z-40 flex items-center justify-between",
              isHighContrast ? "bg-black border-yellow-300" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
          )}>
            <div className="flex items-center gap-2">
                <Button 
                    label="Back"
                    onClick={handleCloseDocument}
                    colorMode={settings.colorMode}
                    variant="secondary"
                    icon={<ArrowLeft className="w-5 h-5" />}
                    className="mr-2"
                />
                <h1 className="text-lg font-bold truncate max-w-[200px]" role="heading" aria-level={1}>
                    {document.metadata.name}
                </h1>
            </div>

            <div className="flex items-center gap-2">
                <Button 
                    colorMode={settings.colorMode} 
                    label="PineX Assistant" 
                    variant="primary"
                    onClick={() => setShowReaderChat(true)}
                    icon={<MessageSquare className="w-5 h-5" />}
                />
            </div>
          </header>

          <Reader 
              page={currentPage} 
              settings={settings}
              isProcessing={isProcessing}
          />

          {/* Floating Sticky Controls for Pagination at Bottom of Reader */}
          <div className={clsx(
              "fixed bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none"
          )}>
              <div className={clsx(
                  "flex items-center gap-4 px-6 py-3 rounded-full shadow-xl pointer-events-auto border",
                  isHighContrast ? "bg-black border-yellow-300" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              )}>
                  <Button 
                      colorMode={settings.colorMode} 
                      label="Previous Page" 
                      variant="secondary"
                      onClick={() => changePage(-1)}
                      disabled={currentPageIndex === 0}
                      icon={<ChevronLeft className="w-6 h-6" />}
                  />
                  <span className="font-bold min-w-[3ch] text-center">
                    {currentPageIndex + 1}
                  </span>
                  <Button 
                      colorMode={settings.colorMode} 
                      label="Next Page" 
                      variant="secondary"
                      onClick={() => changePage(1)}
                      disabled={currentPageIndex === (document.metadata.pageCount - 1)}
                      icon={<ChevronRight className="w-6 h-6" />}
                  />
              </div>
          </div>

          {/* Modal PineX for Reader */}
          {showReaderChat && (
              <PineX 
                  pageContext={currentPage?.text} 
                  settings={settings} 
                  isEmbedded={false}
                  onClose={() => setShowReaderChat(false)}
              />
          )}
        </>
      ) : (
        /* 
           MODE 2: APP MODE 
           Active when no document is loaded. Tabs are visible. 
        */
        <>
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {activeTab === Tab.DOCUMENTS && (
                    <DocumentsView 
                        onFileUpload={handleFileUpload}
                        onResume={handleResumeClick}
                        recentFile={recentFile}
                        settings={settings}
                    />
                )}
                {activeTab === Tab.PINEX && (
                    <PineX 
                        settings={settings}
                        isEmbedded={true}
                    />
                )}
                {activeTab === Tab.SETTINGS && (
                    <SettingsPanel 
                        settings={settings}
                        onUpdateSettings={setSettings}
                    />
                )}
            </main>

            <BottomNav 
                currentTab={activeTab} 
                onTabChange={setActiveTab} 
                colorMode={settings.colorMode}
            />
        </>
      )}

    </div>
  );
}