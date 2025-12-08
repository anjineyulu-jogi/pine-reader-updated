
import React, { useRef } from 'react';
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
  // Styles as requested by user
  const navStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 'auto', // Allow expansion for safe area
    minHeight: '56px',
    background: '#000000',
    zIndex: 9999,
    paddingBottom: 'env(safe-area-inset-bottom)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTop: '1px solid #333'
  };

  const tabs = [
    { id: Tab.DOCUMENTS, label: 'Documents', icon: <Home className="w-6 h-6" />, domId: 'tab-documents' },
    { id: Tab.PINEX, label: 'Pine-X', icon: <MessageSquare className="w-6 h-6" />, domId: 'tab-pinex' },
    { id: Tab.BOOKMARKS, label: 'Bookmarks', icon: <Bookmark className="w-6 h-6" />, domId: 'tab-bookmarks' },
    { id: Tab.SETTINGS, label: 'Settings', icon: <Settings className="w-6 h-6" />, domId: 'tab-settings' },
    { id: Tab.WEB_READER, label: 'Web', icon: <Globe className="w-6 h-6" />, domId: 'tab-web' },
  ];

  return (
    <div 
      style={navStyle}
      role="tablist"
      aria-label="App Sections"
    >
        {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={tab.domId}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                onClick={() => {
                    triggerHaptic('light');
                    onTabChange(tab.id);
                }}
                className="flex-1 h-[56px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
                style={{
                    color: isActive ? '#FFC107' : '#9CA3AF' // Golden for active, Gray for inactive
                }}
              >
                {/* Icon with fill handling */}
                {React.cloneElement(tab.icon as React.ReactElement, {
                    fill: isActive ? "currentColor" : "none",
                    strokeWidth: isActive ? 2.5 : 2
                })}
                <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
              </button>
            );
        })}
    </div>
  );
};
