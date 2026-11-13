'use client';

import React from 'react';
import { DashboardStats } from '@/lib/api';

export type EtapaKey =
  | 'sin_gestion'
  | 'en_levantamiento'
  | 'en_proyecto'
  | 'en_regularizacion'
  | 'sello_rojo'
  | 'sello_amarillo'
  | 'sello_verde';

/** Etapas del proceso, de izquierda a derecha. Cada establecimiento está en exactamente una. */
export const ETAPAS_CARTERA: { key: EtapaKey; label: string; color: string }[] = [
  { key: 'sin_gestion',       label: 'Sin gestión',            color: 'var(--color-gris)' },
  { key: 'en_levantamiento',  label: 'Levantamiento',          color: 'var(--color-gris)' },
  { key: 'en_proyecto',       label: 'Proyecto TC6',           color: 'var(--color-primary)' },
  { key: 'en_regularizacion', label: 'Obras / Regularización', color: 'var(--color-primary)' },
  { key: 'sello_rojo',        label: 'Sello rojo',             color: 'var(--color-rojo)' },
  { key: 'sello_amarillo',    label: 'Sello amarillo',         color: 'var(--color-amarillo)' },
  { key: 'sello_verde',       label: 'Sello verde',            color: 'var(--color-verde)' },
];

interface Props {
  stats: DashboardStats | null;
  loading: boolean;
  selected: EtapaKey | null;
  onSelect: (etapa: EtapaKey | null) => void;
}

/** Distribución de la cartera por etapa. Las cifras suman el total y filtran la tabla al hacer clic. */
export function EtapasCartera({ stats, loading, selected, onSelect }: Props) {
  const valor = (k: EtapaKey) => (stats ? Number(stats[k] ?? 0) : 0);
  const total = stats?.total_ee ?? 0;
  const verdes = valor('sello_verde');

  return (
    <section aria-labelledby="cartera-titulo" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--space-3) var(--space-6)' }}>
        <div>
          <h2 id="cartera-titulo" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>
            Cobertura de sello verde
          </h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-3xl)', lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--color-verde)' }}>
              {loading ? '…' : verdes}
            </span>
            <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-lg)' }}>de {loading ? '…' : total}</span>
            {!loading && total > 0 && (
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>· {Math.round((verdes / total) * 100)}%</span>
            )}
          </div>
        </div>
        <p style={{ margin: 0, maxWidth: 340, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Cada establecimiento está en una sola etapa, por lo que las cifras suman el total. Haz clic en una etapa para filtrar la tabla.
        </p>
      </div>

      {/* Barra proporcional (decorativa: las cifras están en las tarjetas) */}
      <div aria-hidden="true" style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: 'var(--color-surface-2)' }}>
        {!loading && total > 0 && ETAPAS_CARTERA.map((e) => (
          <div key={e.key} style={{ width: `${(valor(e.key) / total) * 100}%`, background: e.color, opacity: selected && selected !== e.key ? 0.3 : 1, transition: 'opacity 180ms' }} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)' }}>
        {ETAPAS_CARTERA.map((e) => (
          <button
            key={e.key}
            type="button"
            className="cartera-tile"
            style={{ ['--tile-color' as string]: e.color }}
            aria-pressed={selected === e.key}
            onClick={() => onSelect(selected === e.key ? null : e.key)}
          >
            <span className="cartera-tile-num">{loading ? '…' : valor(e.key)}</span>
            <span className="cartera-tile-label">{e.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
