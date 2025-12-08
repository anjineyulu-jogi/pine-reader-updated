import React from 'react';

export const PineappleLogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-label="Golden Pineapple Crown Logo">
      <defs>
        <linearGradient id="goldBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD700"/>
          <stop offset="100%" stopColor="#FFA500"/>
        </linearGradient>
        <linearGradient id="royalCrown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDB931"/>
          <stop offset="50%" stopColor="#FFD700"/>
          <stop offset="100%" stopColor="#B8860B"/>
        </linearGradient>
      </defs>
      
      {/* Background Leaves */}
      <path d="M256 160 Q200 80 160 140 L256 220 L352 140 Q312 80 256 160" fill="#2E8B57"/>
      <path d="M256 150 Q230 60 200 120 L256 210 L312 120 Q282 60 256 150" fill="#1E5D38"/>
      
      {/* Pineapple Body */}
      <ellipse cx="256" cy="330" rx="110" ry="135" fill="url(#goldBody)" />
      
      {/* Texture */}
      <path d="M190 270 L320 390 M190 330 L320 270 M220 250 L290 410" stroke="#B8860B" strokeWidth="3" opacity="0.3" fill="none"/>
      
      {/* Royal Crown */}
      <path d="M196 140 L196 90 L226 120 L256 60 L286 120 L316 90 L316 140 Z" fill="url(#royalCrown)" stroke="#8B4513" strokeWidth="2"/>
      
      {/* Jewels */}
      <circle cx="196" cy="85" r="6" fill="#DC143C" stroke="#fff" strokeWidth="1"/>
      <circle cx="256" cy="55" r="8" fill="#4169E1" stroke="#fff" strokeWidth="1"/>
      <circle cx="316" cy="85" r="6" fill="#DC143C" stroke="#fff" strokeWidth="1"/>
    </svg>
  );
};