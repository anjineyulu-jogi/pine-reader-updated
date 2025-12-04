import React from 'react';
import { FileText, MessageSquare, Settings } from 'lucide-react';
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

  const containerClass = isHighContrast 
    ? "bg-black border-t-4 border-yellow-300" 
    : "bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800";

  const getButtonClass = (isActive: boolean) => clsx(
    "flex-1 h-full flex flex-col items-center justify-center py-2 gap-1 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:ring-inset touch-manipulation",
    isActive 
      ? (isHighContrast ? "text-black bg-yellow-300 font-bold" : "text-blue-600 dark:text-blue-400 font-medium")
      : (isHighContrast ? "text-yellow-300 hover:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200")
  );

  const handleTabClick = (tab: Tab) => {
    triggerHaptic('light');
    onTabChange(tab);
  };

  return (
    <nav 
      className={clsx("fixed bottom-0 left-0 w-full z-50 shadow-lg pb-[env(safe-area-inset-bottom)] flex justify-around items-stretch h-16", containerClass)}
      aria-label="Main Navigation"
    >
      <button
        type="button"
        onClick={() => handleTabClick(Tab.DOCUMENTS)}
        className={getButtonClass(currentTab === Tab.DOCUMENTS)}
        aria-current={currentTab === Tab.DOCUMENTS ? 'page' : undefined}
      >
        <FileText className="w-6 h-6 mb-1" aria-hidden="true" />
        <span className="text-xs">Documents</span>
      </button>

      <button
        type="button"
        onClick={() => handleTabClick(Tab.PINEX)}
        className={getButtonClass(currentTab === Tab.PINEX)}
        aria-current={currentTab === Tab.PINEX ? 'page' : undefined}
      >
        <MessageSquare className="w-6 h-6 mb-1" aria-hidden="true" />
        <span className="text-xs">PineX</span>
      </button>

      <button
        type="button"
        onClick={() => handleTabClick(Tab.SETTINGS)}
        className={getButtonClass(currentTab === Tab.SETTINGS)}
        aria-current={currentTab === Tab.SETTINGS ? 'page' : undefined}
      >
        <Settings className="w-6 h-6 mb-1" aria-hidden="true" />
        <span className="text-xs">Settings</span>
      </button>
    </nav>
  );
};