'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import { AppShell } from '@/components/layout/AppShell';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth(true);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        background: 'var(--color-bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
              color: '#fff',
              fontFamily: 'Satoshi, sans-serif',
              fontWeight: 900,
              fontSize: '20px',
            }}
          >
            SV
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Autenticando…
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null; // router replaces view in useAuth hook

  return (
    <SidebarProvider>
      <AppShell>
        {children}
      </AppShell>
    </SidebarProvider>
  );
}
