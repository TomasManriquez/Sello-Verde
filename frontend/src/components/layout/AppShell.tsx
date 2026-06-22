'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useSidebar } from './SidebarContext';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { collapsed } = useSidebar();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className={`main-area ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Header />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
