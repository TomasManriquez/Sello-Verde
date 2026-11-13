'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useDashboard } from '@/hooks/useDashboard';
import { establecimientosApi, vencimientosApi, Establecimiento, Vencimiento } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { EstablecimientoTable } from '@/components/tables/EstablecimientoTable';
import { EtapasCartera, EtapaKey, ETAPAS_CARTERA } from '@/components/dashboard/EtapasCartera';
import { RequiereAccion } from '@/components/dashboard/RequiereAccion';
import { ComunasYPlazos } from '@/components/dashboard/ComunasYPlazos';
import { RegistrarInspeccionModal } from '@/components/dashboard/RegistrarInspeccionModal';
import { puede } from '@/lib/capacidades';

const sectionTitle: React.CSSProperties = { fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-lg)', margin: 0 };

export default function DashboardPage() {
  const { stats, vencimientos, loading: statsLoading, error: statsError } = useDashboard();
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [eeLoading, setEeLoading] = useState(true);
  const [eeError, setEeError] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<EtapaKey | null>(null);
  const [inspeccionOpen, setInspeccionOpen] = useState(false);

  const [plazos, setPlazos] = useState<Vencimiento[]>([]);

  useEffect(() => {
    establecimientosApi.list()
      .then(setEstablecimientos)
      .catch(err => setEeError(err.message || 'Error al cargar establecimientos'))
      .finally(() => setEeLoading(false));
    // Con los sellos verdes incluidos, para el calendario de 6 meses (si falla, queda vacío)
    vencimientosApi.list(true).then(r => setPlazos(r.items)).catch(() => {});
  }, []);

  // Más urgentes primero: el vencimiento más cercano (o ya vencido) arriba; sin vencimiento al final
  const filas = useMemo(() => {
    const visibles = etapa ? establecimientos.filter(e => e.estado_general === etapa) : establecimientos;
    return [...visibles].sort((a, b) => {
      const fa = a.resumen_sellos?.proximo_vencimiento ?? '9999-12-31';
      const fb = b.resumen_sellos?.proximo_vencimiento ?? '9999-12-31';
      return fa.localeCompare(fb) || a.nombre.localeCompare(b.nombre);
    });
  }, [establecimientos, etapa]);

  const etapaLabel = etapa ? ETAPAS_CARTERA.find(e => e.key === etapa)?.label : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Encabezado con la acción principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)', margin: '0 0 var(--space-1)' }}>
            Tablero de control
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
            Estado de la certificación de gas en los establecimientos del SLEP y los plazos que requieren acción.
          </p>
        </div>
        {puede('write') && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Link href="/establecimientos?nuevo=1" className="btn btn-secondary">+ Establecimiento</Link>
            <Button onClick={() => setInspeccionOpen(true)}>Registrar inspección</Button>
          </div>
        )}
      </div>

      {statsError && (
        <div style={{ color: 'var(--color-rojo)', background: 'oklch(75% 0.1 20 / 0.1)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
          No se pudieron cargar los indicadores: {statsError}
        </div>
      )}

      {/* 1. Qué requiere atención hoy */}
      <RequiereAccion vencimientos={vencimientos} loading={statsLoading} />

      {/* 2. Cómo está la cartera */}
      <EtapasCartera stats={stats} loading={statsLoading} selected={etapa} onSelect={setEtapa} />

      <ComunasYPlazos establecimientos={establecimientos} vencimientos={plazos} loading={eeLoading} />

      {/* 3. Detalle por establecimiento */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h2 style={sectionTitle}>
            {etapaLabel ? `Establecimientos en “${etapaLabel}”` : 'Todos los establecimientos'}
          </h2>
          {etapa && (
            <button
              type="button"
              onClick={() => setEtapa(null)}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600, padding: 'var(--space-2) 0', minHeight: 44 }}
            >
              Quitar filtro ✕
            </button>
          )}
        </div>
        {eeError && (
          <div style={{ color: 'var(--color-rojo)', background: 'oklch(75% 0.1 20 / 0.1)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
            {eeError}
          </div>
        )}
        <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          <EstablecimientoTable
            establecimientos={filas}
            loading={eeLoading}
            emptyMessage={etapa ? 'Ningún establecimiento está en esta etapa.' : undefined}
          />
        </div>
      </section>

      <RegistrarInspeccionModal open={inspeccionOpen} onClose={() => setInspeccionOpen(false)} establecimientos={establecimientos} />
    </div>
  );
}
