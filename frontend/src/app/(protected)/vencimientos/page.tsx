'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, CircleCheck, Clock, Calendar } from 'lucide-react';
import { UrgenciaVencimiento } from '@/lib/api';
import { useVencimientos } from '@/hooks/useVencimientos';
import { VencimientoFila } from '@/components/vencimientos/VencimientoFila';
import { URGENCIAS, URGENCIA_COLOR, URGENCIA_TITULO } from '@/lib/vencimientos';

type Filtro = 'atender' | 'al_dia' | 'todas';

const ICONO: Record<UrgenciaVencimiento, React.ElementType> = {
  fuera_de_plazo: CircleAlert,
  proximo_30d: Clock,
  proximo_90d: Calendar,
  al_dia: CircleCheck,
};

export default function VencimientosPage() {
  const { items, resumen, loading, error } = useVencimientos(true);
  const [filtro, setFiltro] = useState<Filtro>('atender');

  const visibles = useMemo(() => {
    if (filtro === 'todas') return items;
    if (filtro === 'al_dia') return items.filter((v) => v.urgencia === 'al_dia');
    return items.filter((v) => v.urgencia !== 'al_dia');
  }, [items, filtro]);

  const porAtender = resumen ? resumen.fuera_de_plazo + resumen.proximos_30d + resumen.proximos_90d : 0;
  const filtros: { key: Filtro; label: string; n: number }[] = [
    { key: 'atender', label: 'Por atender', n: porAtender },
    { key: 'al_dia', label: 'Al día', n: resumen?.al_dia ?? 0 },
    { key: 'todas', label: 'Todas', n: items.length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)', margin: '0 0 var(--space-1)' }}>
            Vencimientos
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
            {loading || !resumen
              ? 'Plazos de cada instalación de gas.'
              : resumen.requieren_accion > 0
                ? `${resumen.requieren_accion} ${resumen.requieren_accion === 1 ? 'instalación pide' : 'instalaciones piden'} acción ahora · ${resumen.proximos_90d} en los próximos 90 días · ${resumen.al_dia} al día`
                : `Ninguna instalación pide acción ahora · ${resumen.proximos_90d} en los próximos 90 días · ${resumen.al_dia} al día`}
          </p>
        </div>
        <div role="group" aria-label="Filtrar vencimientos" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {filtros.map((f) => {
            const activo = filtro === f.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={activo}
                onClick={() => setFiltro(f.key)}
                className="btn btn-secondary btn-sm"
                style={{
                  minHeight: 44,
                  fontWeight: activo ? 700 : 500,
                  borderColor: activo ? 'var(--color-primary)' : undefined,
                  color: activo ? 'var(--color-primary)' : undefined,
                }}
              >
                {f.label} · {f.n}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--color-rojo)', background: 'oklch(75% 0.1 20 / 0.1)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
      ) : visibles.length === 0 ? (
        <div className="surface" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          {filtro === 'al_dia'
            ? 'Aún no hay instalaciones con Sello Verde vigente por más de 90 días.'
            : 'No hay plazos por atender. Los sellos verdes aparecen aquí 90 días antes de vencer.'}
        </div>
      ) : (
        URGENCIAS.map((u) => {
          const grupo = visibles.filter((v) => v.urgencia === u);
          if (grupo.length === 0) return null;
          const Icono = ICONO[u];
          return (
            <section key={u} aria-labelledby={`grupo-${u}`}>
              <h2
                id={`grupo-${u}`}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 var(--space-2)' }}
              >
                <Icono size={16} aria-hidden="true" color={URGENCIA_COLOR[u]} />
                {URGENCIA_TITULO[u]} ({grupo.length})
              </h2>
              <div className="surface" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {grupo.map((v, i) => (
                  <div key={v.instalacion_id} style={i > 0 ? { borderTop: '1px solid var(--color-border)' } : undefined}>
                    <VencimientoFila v={v} />
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
        Los plazos se calculan solos a partir del último sello de cada instalación: un Sello Verde dura 2 años y un sello amarillo o rojo tiene 90 días para regularizarse.
        Se cierran al registrar una nueva inspección. <Link href="/establecimientos" style={{ color: 'var(--color-primary)' }}>Ver establecimientos</Link>
      </p>
    </div>
  );
}
