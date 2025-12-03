
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
  
  let baseClass = '';
  if (isHighContrast) {
    baseClass = UI_CLASSES.buttonHighContrast;
  } else {
    if (variant === 'primary') baseClass = UI_CLASSES.buttonPrimary;
    else if (variant === 'secondary') baseClass = UI_CLASSES.buttonSecondary;
    else baseClass = UI_CLASSES.buttonGhost;
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerHaptic('light'); // Default haptic for all buttons
    if (onClick) onClick(e);
  };

  return (
    <button
      aria-label={label}
      className={clsx(
        baseClass,
        "flex items-center justify-center gap-2",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children || label}</span>
    </button>
  );
};
