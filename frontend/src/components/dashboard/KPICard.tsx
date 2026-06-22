'use client';

import React from 'react';

interface KPICardProps {
  number: number | string;
  label: string;
  trend?: string;
  accentColor?: string;
  className?: string;
}

export function KPICard({ number, label, trend, accentColor = 'var(--color-primary)', className = '' }: KPICardProps) {
  return (
    <div
      className={`kpi-card animate-fade-up ${className}`}
      style={{ borderLeftColor: accentColor }}
    >
      <div className="kpi-number" style={{ color: accentColor }}>
        {number}
      </div>
      <div className="kpi-label">{label}</div>
      {trend && <div className="kpi-trend">{trend}</div>}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────
export function KPICardSkeleton() {
  return (
    <div className="kpi-card">
      <div className="skeleton" style={{ width: '60%', height: '2.5rem', borderRadius: 'var(--radius-sm)' }} />
      <div className="skeleton" style={{ width: '80%', height: '0.875rem', borderRadius: 'var(--radius-sm)' }} />
    </div>
  );
}
