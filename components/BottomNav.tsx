
import React from 'react';
import { Home, MessageCircle, Settings, Menu } from 'lucide-react';
import { Tab, ColorMode } from '../types';
import clsx from 'clsx';
import { triggerHaptic } from '../services/hapticService';

interface BottomNavProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  colorMode: ColorMode;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, colorMode }) => {
  const isHighContrast = colorMode === ColorMode.HIGH_CONTRAST;

  // Navigation Items - New Order: Docs -> Pine-X -> Settings -> More
  const tabs = [
    { id: Tab.DOCUMENTS, label: 'Docs', icon: <Home className="w-7 h-7" /> },
    { id: Tab.PINEX, label: 'Pine-X', icon: <MessageCircle className="w-7 h-7" /> },
    { id: Tab.SETTINGS, label: 'Settings', icon: <Settings className="w-7 h-7" /> },
    { id: Tab.MORE, label: 'More', icon: <Menu className="w-7 h-7" /> },
  ];

  return (
    <div 
      className={clsx(
        "fixed bottom-0 left-0 right-0 z-50 pb-safe border-t transition-colors min-h-[90px] h-auto py-2 flex items-center justify-between px-2",
        isHighContrast 
          ? "bg-black border-yellow-300" 
          : "bg-white dark:bg-[#151515] border-gray-100 dark:border-gray-800 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]"
      )}
      role="tablist" 
      aria-label="Main Navigation"
    >
      {tabs.map((tab) => {
          // Check active state. 
          // "More" tab stays active if we are in a sub-tool (OCR, Web Reader, Bookmarks)
          const isActive = currentTab === tab.id || 
                           (tab.id === Tab.MORE && (currentTab === Tab.OCR || currentTab === Tab.WEB_READER || currentTab === Tab.BOOKMARKS));
          
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => {
                  triggerHaptic('light');
                  onTabChange(tab.id as Tab);
              }}
              className="flex-1 h-full flex flex-col items-center justify-center gap-1.5 group active:scale-90 transition-transform min-w-[64px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 rounded-xl"
            >
              <div className={clsx(
                  "w-14 h-9 flex items-center justify-center transition-all duration-300 rounded-3xl",
                  isActive 
                      ? (isHighContrast ? "bg-yellow-300 text-black" : "bg-[#FFC107] text-black shadow-md") 
                      : "bg-transparent text-gray-400 dark:text-gray-500"
              )}>
                  {React.cloneElement(tab.icon as React.ReactElement<any>, {
                      strokeWidth: isActive ? 2.5 : 2,
                      className: "w-6 h-6"
                  })}
              </div>
              
              <span className={clsx(
                  "text-xs font-bold tracking-wide transition-colors truncate max-w-full px-1",
                  isActive 
                      ? (isHighContrast ? "text-yellow-300" : "text-black dark:text-white") 
                      : "text-gray-400 dark:text-gray-500"
              )}>
                  {tab.label}
              </span>
            </button>
          );
      })}
    </div>
  );
};
