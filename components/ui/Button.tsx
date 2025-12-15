
import React from 'react';
import clsx from 'clsx';
import { ColorMode } from '../../types';
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
  
  // Base classes enforce minimum 48px height for accessibility
  const baseTouchTarget = "min-h-[56px] min-w-[56px] flex items-center justify-center gap-3 transition-transform active:scale-95 text-base font-bold tracking-wide";
  
  let variantClass = '';

  if (isHighContrast) {
    // High Contrast: Simple, Bold, Yellow on Black
    variantClass = "bg-yellow-300 text-black border-4 border-black hover:bg-yellow-400 uppercase rounded-3xl shadow-none";
  } else {
    // Modern Design System
    switch (variant) {
      case 'primary':
        // The Pineapple Yellow Standard
        variantClass = "bg-[#FFC107] text-black hover:bg-[#ffca2c] rounded-3xl shadow-md border-2 border-transparent";
        break;
      case 'secondary':
        // Outlined
        variantClass = "bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 rounded-3xl";
        break;
      case 'ghost':
        // Text Button
        variantClass = "bg-transparent text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10 rounded-2xl";
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
