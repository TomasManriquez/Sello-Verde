'use client';

import React from 'react';
import Link from 'next/link';
import { Alerta } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { ALERTA_TIPOS, diasRestantesAlerta, fichaHref, formatDate, getUrgencyColor, instalacionLabel } from '@/lib/constants';

const MAX_FILAS = 6;

/** Alertas que requieren acción en los próximos 30 días (incluye las ya vencidas), de la más urgente a la menos. */
export function RequiereAccion({ alertas, loading }: { alertas: Alerta[]; loading: boolean }) {
  const ordenadas = [...alertas].sort((a, b) => diasRestantesAlerta(a) - diasRestantesAlerta(b));
  const visibles = ordenadas.slice(0, MAX_FILAS);
  const resto = ordenadas.length - visibles.length;

  return (
    <section aria-labelledby="accion-titulo" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <h2 id="accion-titulo" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-lg)', margin: 0 }}>
          Requiere acción{!loading && ordenadas.length > 0 ? ` (${ordenadas.length})` : ''}
        </h2>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Plazos que vencen en los próximos 30 días o ya vencidos
        </span>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-md)' }} />
      ) : visibles.length === 0 ? (
        <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          ✓ No hay plazos que vencen en los próximos 30 días.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {visibles.map((a) => {
            const dias = diasRestantesAlerta(a);
            const color = getUrgencyColor(dias);
            const donde = instalacionLabel(a.instalacion);
            const vencida = dias < 0;
            return (
              <div
                key={a.id}
                className="surface"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${color}` }}
              >
                <div style={{ minWidth: 64, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)', lineHeight: 1, color }}>
                    {vencida ? Math.abs(dias) : dias}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {vencida ? 'días vencida' : 'días'}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700 }}>{a.expediente?.establecimiento?.nombre ?? `Expediente #${a.expediente_id}`}</div>
                  {donde && <div style={{ fontSize: 'var(--text-sm)' }}>{donde}</div>}
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {ALERTA_TIPOS[a.tipo as keyof typeof ALERTA_TIPOS] ?? a.tipo} · {vencida ? 'venció' : 'vence'} el {formatDate(a.fecha_vencimiento)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {a.instalacion_id && (
                    <Button
                      as="a"
                      href={`/expedientes/${a.expediente_id}/certificacion?instalacion=${a.instalacion_id}`}
                      variant="secondary"
                      size="sm"
                    >
                      Registrar inspección
                    </Button>
                  )}
                  <Link href={fichaHref(a)} className="btn btn-ghost btn-sm">Ver ficha</Link>
                </div>
              </div>
            );
          })}
          {resto > 0 && (
            <Link href="/alertas" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', fontWeight: 600 }}>
              Ver las {resto} {resto === 1 ? 'alerta restante' : 'alertas restantes'} →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
