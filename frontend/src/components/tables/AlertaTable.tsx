'use client';

import React from 'react';
import Link from 'next/link';
import { Alerta } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, getUrgencyColor } from '@/lib/constants';

interface AlertaTableProps {
  alertas: Alerta[];
  loading?: boolean;
  onMarcarResuelta?: (id: number) => void;
}

/** Genera un nombre descriptivo para la alerta a partir de los datos enriquecidos */
function getAlertaTitle(alerta: Alerta): string {
  // Nombre del establecimiento desde el join
  const eeNombre =
    alerta.expediente?.establecimiento?.nombre ??
    `Expediente #${alerta.expediente_id}`;

  // Info de instalación/local
  let instalacionInfo = '';
  if (alerta.instalacion?.local?.nombre) {
    instalacionInfo = ` — ${alerta.instalacion.local.nombre}`;
  } else if (alerta.instalacion_id) {
    instalacionInfo = ` — Instalación #${alerta.instalacion_id}`;
  }

  // Tipo de sello
  const tipoLabel = (alerta.tipo || alerta.tipo_alerta || '')
    .replace('vencimiento_sello_verde', 'Sello Verde')
    .replace('plazo_regularizacion_90d', 'Regularización')
    .replace(/_/g, ' ');

  return `${eeNombre}${instalacionInfo} · ${tipoLabel}`;
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
        const title        = getAlertaTitle(alerta);

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

            {/* Title & info — clickeable a expediente */}
            <Link
              href={`/expedientes/${alerta.expediente_id}`}
              style={{ flex: 1, minWidth: '200px', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                {title}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <span>{alerta.mensaje ?? (alerta.tipo_alerta ?? alerta.tipo)?.replace(/_/g, ' ')}</span>
                <span>·</span>
                <span>Vence: {formatDate(alerta.fecha_vencimiento)}</span>
              </div>
            </Link>

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

              <Link href={`/expedientes/${alerta.expediente_id}`}>
                <Button variant="ghost" size="sm">
                  Ver →
                </Button>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
