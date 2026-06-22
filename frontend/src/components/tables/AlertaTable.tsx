'use client';

import React from 'react';
import { Alerta } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, getUrgencyColor } from '@/lib/constants';

interface AlertaTableProps {
  alertas: Alerta[];
  loading?: boolean;
  onMarcarResuelta?: (id: number) => void;
}

export function AlertaTable({ alertas, loading, onMarcarResuelta }: AlertaTableProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
    );
  }

  if (!alertas.length) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">🔔</span>
        <p>No hay alertas en esta categoría</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {alertas.map((alerta, i) => {
        const urgencyColor = getUrgencyColor(alerta.dias_restantes);
        const isOverdue    = alerta.dias_restantes < 0;

        return (
          <div
            key={alerta.id}
            className={`surface animate-fade-up stagger-${Math.min(i + 1, 6)}`}
            style={{
              padding: 'var(--space-4) var(--space-6)',
              borderLeft: `4px solid ${urgencyColor}`,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
            }}
          >
            {/* Days remaining indicator */}
            <div style={{ textAlign: 'center', minWidth: '64px' }}>
              <div
                style={{
                  fontFamily: 'Satoshi, sans-serif',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 900,
                  color: urgencyColor,
                  lineHeight: 1,
                }}
              >
                {isOverdue ? `+${Math.abs(alerta.dias_restantes)}` : alerta.dias_restantes}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {isOverdue ? 'días vencida' : 'días'}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                {alerta.establecimiento_nombre ?? `Expediente #${alerta.expediente_id}`}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <span>{alerta.tipo_alerta?.replace(/_/g, ' ')}</span>
                <span>·</span>
                <span>Vence: {formatDate(alerta.fecha_vencimiento)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Badge estado={alerta.estado} />

              {alerta.estado !== 'resuelta' && onMarcarResuelta && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onMarcarResuelta(alerta.id)}
                >
                  Marcar resuelta
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
