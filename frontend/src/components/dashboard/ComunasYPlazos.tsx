'use client';

import React, { useMemo } from 'react';
import { Establecimiento, Vencimiento } from '@/lib/api';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const N_MESES = 6;
const ALTO_MAX = 80;

const tituloStyle: React.CSSProperties = { fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 };

/** "Por comuna" (avance hacia el sello verde) y "Plazos y vencimientos" de los próximos 6 meses. */
export function ComunasYPlazos({ establecimientos, vencimientos, loading }: { establecimientos: Establecimiento[]; vencimientos: Vencimiento[]; loading: boolean }) {
  const comunas = useMemo(() => {
    const por = new Map<string, { t: number; v: number; sin: number }>();
    for (const e of establecimientos) {
      const c = por.get(e.comuna || 'Sin comuna') ?? { t: 0, v: 0, sin: 0 };
      c.t++;
      if (e.estado_general === 'sello_verde') c.v++;
      else if (e.estado_general === 'sin_gestion') c.sin++;
      por.set(e.comuna || 'Sin comuna', c);
    }
    return Array.from(por.entries()).sort((a, b) => b[1].t - a[1].t);
  }, [establecimientos]);

  const meses = useMemo(() => {
    const hoy = new Date();
    const base = hoy.getFullYear() * 12 + hoy.getMonth();
    const cuenta = Array<number>(N_MESES).fill(0);
    for (const v of vencimientos) {
      const [y, m] = v.fecha_limite.split('-').map(Number);
      // Lo ya vencido sigue pendiente: se cuenta en el mes actual
      const i = Math.max(0, y * 12 + (m - 1) - base);
      if (i < N_MESES) cuenta[i]++;
    }
    return cuenta.map((n, i) => ({ n, label: MESES[(hoy.getMonth() + i) % 12] }));
  }, [vencimientos]);
  const max = Math.max(1, ...meses.map((m) => m.n));
  const totalPlazos = meses.reduce((s, m) => s + m.n, 0);

  const card: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', minWidth: 0 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'var(--space-4)' }}>
      <section className="surface" aria-labelledby="comunas-titulo" style={card}>
        <h2 id="comunas-titulo" style={tituloStyle}>Por comuna</h2>
        {loading ? <div className="skeleton" style={{ height: 120 }} /> : comunas.map(([nombre, c]) => (
          <div key={nombre} style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 110px) minmax(0, 1fr) 56px', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{nombre}</span>
            <div
              role="img"
              aria-label={`${c.v} con sello verde, ${c.t - c.v - c.sin} en proceso y ${c.sin} sin gestión`}
              style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}
            >
              <div style={{ flex: `${c.v} 1 0`, background: 'var(--color-verde)' }} />
              <div style={{ flex: `${c.t - c.v - c.sin} 1 0`, background: 'var(--color-primary)' }} />
              <div style={{ flex: `${c.sin} 1 0`, background: 'var(--color-gris)' }} />
            </div>
            <span style={{ fontSize: 'var(--text-xs)', textAlign: 'right', color: 'var(--color-text-muted)' }}>
              <strong style={{ color: 'var(--color-verde)' }}>{c.v}</strong> / {c.t}
            </span>
          </div>
        ))}
      </section>

      <section className="surface" aria-labelledby="plazos-titulo" style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <h2 id="plazos-titulo" style={tituloStyle}>Plazos y vencimientos · 6 meses</h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{loading ? '…' : `${totalPlazos} en total`}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${N_MESES}, minmax(0, 1fr))`, gap: 'var(--space-2)', alignItems: 'end', height: ALTO_MAX + 40 }}>
          {meses.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }}>{loading ? '' : m.n}</span>
              <div
                aria-hidden="true"
                style={{ width: '100%', maxWidth: 44, height: m.n === 0 ? 3 : Math.round((m.n / max) * ALTO_MAX), borderRadius: '6px 6px 2px 2px', background: m.n === 0 ? 'var(--color-border)' : i === 0 ? 'var(--color-rojo)' : 'var(--color-amarillo)' }}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{m.label}</span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Incluye plazos de regularización y vencimientos de sellos verdes.</span>
      </section>
    </div>
  );
}
