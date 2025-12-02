import React from 'react';
import clsx from 'clsx';
import { ColorMode } from '../../types';
import { UI_CLASSES } from '../../constants';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
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
  ...props 
}) => {
  const isHighContrast = colorMode === ColorMode.HIGH_CONTRAST;
  
  let baseClass = '';
  if (isHighContrast) {
    baseClass = UI_CLASSES.buttonHighContrast;
  } else {
    baseClass = variant === 'primary' ? UI_CLASSES.buttonPrimary : UI_CLASSES.buttonSecondary;
  }

  return (
    <button
      aria-label={label}
      className={clsx(
        baseClass,
        "flex items-center justify-center gap-3",
        className
      )}
      {...props}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children || label}</span>
    </button>
  );
};
