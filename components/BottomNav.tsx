
import React from 'react';
import { Home, MessageSquare, Settings, Bookmark, Globe } from 'lucide-react';
import { Tab, ColorMode } from '../types';
import clsx from 'clsx';
import { triggerHaptic } from '../services/hapticService';

interface BottomNavProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  colorMode: ColorMode;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, colorMode }) => {
  // Navigation Bar Style (Material 3)
  const navStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80px', // Taller for better touch
    zIndex: 9999,
    paddingBottom: 'env(safe-area-inset-bottom)',
    display: 'flex',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  };

  const isHighContrast = colorMode === ColorMode.HIGH_CONTRAST;

  const tabs = [
    { id: Tab.DOCUMENTS, label: 'Docs', icon: <Home className="w-6 h-6" /> },
    { id: Tab.PINEX, label: 'PineX', icon: <MessageSquare className="w-6 h-6" /> },
    { id: Tab.BOOKMARKS, label: 'Bookmarks', icon: <Bookmark className="w-6 h-6" /> },
    { id: Tab.WEB_READER, label: 'Web', icon: <Globe className="w-6 h-6" /> },
    { id: Tab.SETTINGS, label: 'Settings', icon: <Settings className="w-6 h-6" /> },
  ];

  return (
    <nav 
      style={navStyle}
      role="tablist"
      aria-label="Main Navigation"
      className={clsx(
        "border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]",
        isHighContrast 
          ? "bg-black border-yellow-300" 
          : "bg-white dark:bg-[#1e1e1e] border-gray-100 dark:border-gray-800"
      )}
    >
        {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                onClick={() => {
                    triggerHaptic('light');
                    onTabChange(tab.id);
                }}
                className="flex-1 h-full flex flex-col items-center justify-center gap-1 group active:scale-95 transition-transform"
              >
                {/* Icon Container (Pill) */}
                <div className={clsx(
                    "w-16 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                    isActive 
                        ? (isHighContrast ? "bg-yellow-300 text-black" : "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200") 
                        : "bg-transparent text-gray-500 dark:text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-white/5"
                )}>
                    {React.cloneElement(tab.icon as React.ReactElement, {
                        strokeWidth: isActive ? 2.5 : 2,
                        className: "w-6 h-6"
                    })}
                </div>
                
                {/* Label */}
                <span className={clsx(
                    "text-xs font-medium tracking-wide transition-colors",
                    isActive 
                        ? (isHighContrast ? "text-yellow-300 font-bold" : "text-gray-900 dark:text-gray-100") 
                        : "text-gray-500 dark:text-gray-500"
                )}>
                    {tab.label}
                </span>
              </button>
            );
        })}
    </nav>
  );
};
