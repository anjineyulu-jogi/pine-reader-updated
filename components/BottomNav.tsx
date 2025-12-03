import React from 'react';
import { FileText, MessageSquare, Settings } from 'lucide-react';
import { Tab, ColorMode } from '../types';
import clsx from 'clsx';
import { THEME_CLASSES } from '../constants';

interface BottomNavProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  colorMode: ColorMode;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, colorMode }) => {
  const isHighContrast = colorMode === ColorMode.HIGH_CONTRAST;

  const navClass = isHighContrast 
    ? "bg-black border-t-4 border-yellow-300" 
    : "bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800";

  const getButtonClass = (isActive: boolean) => clsx(
    "flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all",
    isActive 
      ? (isHighContrast ? "text-black bg-yellow-300 font-bold" : "text-blue-600 dark:text-blue-400 font-medium")
      : (isHighContrast ? "text-yellow-300 hover:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200")
  );

  return (
    // role="none" ensures screen readers ignore this container grouping and find the buttons directly
    <div 
      className={clsx("fixed bottom-0 left-0 w-full z-50 shadow-lg pb-safe", navClass)}
      role="none"
    >
      <div className="flex justify-around items-stretch h-16" role="none">
        <button
          type="button"
          onClick={() => onTabChange(Tab.DOCUMENTS)}
          className={getButtonClass(currentTab === Tab.DOCUMENTS)}
          aria-label="Documents Tab"
          aria-current={currentTab === Tab.DOCUMENTS ? 'page' : undefined}
        >
          <FileText className="w-6 h-6" />
          <span className="text-xs">Documents</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange(Tab.PINEX)}
          className={getButtonClass(currentTab === Tab.PINEX)}
          aria-label="PineX AI Tab"
          aria-current={currentTab === Tab.PINEX ? 'page' : undefined}
        >
          <MessageSquare className="w-6 h-6" />
          <span className="text-xs">PineX</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange(Tab.SETTINGS)}
          className={getButtonClass(currentTab === Tab.SETTINGS)}
          aria-label="Settings Tab"
          aria-current={currentTab === Tab.SETTINGS ? 'page' : undefined}
        >
          <Settings className="w-6 h-6" />
          <span className="text-xs">Settings</span>
        </button>
      </div>
    </div>
  );
};