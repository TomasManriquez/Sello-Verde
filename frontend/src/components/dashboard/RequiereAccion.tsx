'use client';

import React from 'react';
import Link from 'next/link';
import { Vencimiento } from '@/lib/api';
import { VencimientoFila } from '@/components/vencimientos/VencimientoFila';

const MAX_FILAS = 6;

/** Instalaciones fuera de plazo o con un plazo que vence en los próximos 30 días (ya vienen de la más urgente a la menos). */
export function RequiereAccion({ vencimientos, loading }: { vencimientos: Vencimiento[]; loading: boolean }) {
  const visibles = vencimientos.slice(0, MAX_FILAS);
  const resto = vencimientos.length - visibles.length;

  return (
    <section aria-labelledby="accion-titulo" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <h2 id="accion-titulo" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-lg)', margin: 0 }}>
          Requiere acción{!loading && vencimientos.length > 0 ? ` (${vencimientos.length})` : ''}
        </h2>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Plazos vencidos o que vencen en los próximos 30 días
        </span>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-md)' }} />
      ) : visibles.length === 0 ? (
        <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          ✓ No hay plazos vencidos ni que venzan en los próximos 30 días.
        </div>
      ) : (
        <div className="surface" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {visibles.map((v, i) => (
            <div key={v.instalacion_id} style={i > 0 ? { borderTop: '1px solid var(--color-border)' } : undefined}>
              <VencimientoFila v={v} />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <Link href="/vencimientos" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', fontWeight: 600 }}>
          {resto > 0
            ? `Ver las ${resto} ${resto === 1 ? 'restante' : 'restantes'} y los próximos 90 días →`
            : 'Ver todos los vencimientos →'}
        </Link>
      )}
    </section>
  );
}
