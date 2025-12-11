
import React from 'react';
import clsx from 'clsx';
import { ColorMode } from '../../types';
import { UI_CLASSES } from '../../constants';
import { triggerHaptic } from '../../services/hapticService';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  colorMode: ColorMode;
  label: string; // Enforce explicit label for accessibility
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  colorMode, 
  label, 
  icon, 
  className, 
  children,
  onClick,
  ...props 
}) => {
  const isHighContrast = colorMode === ColorMode.HIGH_CONTRAST;
  
  // Base classes enforce minimum 48px height for accessibility (Google Standard)
  const baseTouchTarget = "min-h-[48px] min-w-[48px] flex items-center justify-center gap-3 transition-all active:scale-95 text-base font-medium";
  
  let variantClass = '';

  if (isHighContrast) {
    // High Contrast: Simple, Bold, Yellow on Black
    variantClass = "bg-yellow-300 text-black border-4 border-black hover:bg-yellow-400 font-bold uppercase tracking-wide rounded-lg";
  } else {
    // Google Material Design Style
    switch (variant) {
      case 'primary':
        // Filled Pill
        variantClass = "bg-blue-600 text-white hover:bg-blue-700 rounded-full shadow-md";
        break;
      case 'secondary':
        // Outlined Pill
        variantClass = "bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 rounded-full";
        break;
      case 'ghost':
        // Text Button (Rectangle with rounded corners)
        variantClass = "bg-transparent text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10 rounded-xl";
        break;
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerHaptic('light');
    if (onClick) onClick(e);
  };

  return (
    <button
      aria-label={label}
      className={clsx(baseTouchTarget, variantClass, className)}
      onClick={handleClick}
      {...props}
    >
      {icon && <span aria-hidden="true" className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};
