'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { useSidebar } from './SidebarContext';
import { useAuth } from '@/hooks/useAuth';

const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard':       'Tablero',
  '/establecimientos':'Establecimientos',
  '/expedientes':     'Expedientes',
  '/alertas':         'Alertas',
  '/login':           'Iniciar Sesión',
};

function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let path = '';
  for (const seg of segments) {
    path += '/' + seg;
    const label = BREADCRUMB_MAP[path] ??
      (seg.match(/^\d+$/) ? `#${seg}` : seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '));
    crumbs.push({ label, href: path });
  }
  return crumbs;
}

export function Header() {
  const pathname   = usePathname();
  const { toggleMobile } = useSidebar();
  const { user, logout } = useAuth(false);
  const crumbs = buildBreadcrumbs(pathname);

  return (
    <header className="header">
      {/* Mobile hamburger */}
      <button
        className="btn-ghost btn btn-sm hide-mobile"
        onClick={toggleMobile}
        style={{ display: 'none' }}
        aria-label="Toggle menu"
      />
      <button
        className="btn btn-ghost btn-sm"
        onClick={toggleMobile}
        aria-label="Toggle menu"
        style={{
          display: 'none',
          padding: 'var(--space-2)',
          minHeight: '44px',
          minWidth: '44px',
        }}
        id="mobile-menu-btn"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}
      >
        {crumbs.map((crumb, i) => (
          <React.Fragment key={crumb.href}>
            {i > 0 && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: 'var(--color-text-subtle)' }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
            <span
              style={{
                fontSize: 'var(--text-sm)',
                color: i === crumbs.length - 1 ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontWeight: i === crumbs.length - 1 ? 600 : 400,
              }}
            >
              {crumb.label}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <ThemeToggle />

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text)' }}>
                {user.nombre}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {user.email}
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={logout}
              style={{ minWidth: 44, minHeight: 44, padding: 'var(--space-2)' }}
              title="Cerrar sesión"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
