'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  onClick?: () => void;
}

export function Card({ children, className = '', glass = false, padding = 'md', onClick }: CardProps) {
  const padClass = {
    none: '',
    sm:   'p-4',
    md:   'p-6',
    lg:   'p-8',
  }[padding];

  const glassStyle: React.CSSProperties = glass ? {
    background: 'oklch(98% 0.01 80 / 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  } : {};

  return (
    <div
      className={`surface ${padClass} ${className}`}
      style={glassStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
}
