'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  as?: 'button' | 'a';
}

interface AnchorButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  as: 'a';
  href: string;
}

type Props = ButtonProps | AnchorButtonProps;

export function Button(props: Props) {
  const {
    variant = 'primary',
    size    = 'md',
    loading,
    className = '',
    children,
    as: Tag  = 'button',
    ...rest
  } = props as ButtonProps & { as?: 'button' | 'a' };

  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    loading ? 'opacity-50' : '',
    className,
  ].filter(Boolean).join(' ');

  if (Tag === 'a') {
    const { href, ...anchorRest } = rest as React.AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string };
    return (
      <a href={href} className={cls} {...anchorRest}>
        {loading ? <LoadingSpinner /> : children}
      </a>
    );
  }

  return (
    <button
      className={cls}
      disabled={loading || (rest as ButtonProps).disabled}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {loading ? <LoadingSpinner /> : children}
    </button>
  );
}

function LoadingSpinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
