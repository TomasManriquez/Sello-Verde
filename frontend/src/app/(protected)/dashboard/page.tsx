'use client';

import React, { useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { establecimientosApi, Establecimiento } from '@/lib/api';
import { KPICard } from '@/components/dashboard/KPICard';
import { AlertChip } from '@/components/dashboard/AlertChip';
import { EstablecimientoTable } from '@/components/tables/EstablecimientoTable';

export default function DashboardPage() {
  const { stats, alertas, loading: statsLoading, error: statsError } = useDashboard();
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [eeLoading, setEeLoading] = useState(true);
  const [eeError, setEeError] = useState<string | null>(null);

  useEffect(() => {
    establecimientosApi.list()
      .then(data => {
        setEstablecimientos(data);
      })
      .catch(err => {
        setEeError(err.message || 'Error al cargar establecimientos');
      })
      .finally(() => {
        setEeLoading(false);
      });
  }, []);

  const totalAlertas = stats?.alertas_activas ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)', marginBottom: 'var(--space-1)' }}>
          Tablero de Control Sello Verde
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          Resumen operativo y plazos críticos de instalaciones de gas en establecimientos educacionales SLEP.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-4)',
      }}>
        <KPICard
          number={statsLoading ? '…' : stats?.total_ee ?? 0}
          label="Total de Establecimientos"
          accentColor="var(--color-text)"
        />
        <KPICard
          number={statsLoading ? '…' : stats?.sin_gestion ?? 0}
          label="Sin Gestión Iniciada"
          accentColor="var(--color-text-muted)"
        />
        <KPICard
          number={statsLoading ? '…' : stats?.en_proyecto ?? 0}
          label="En Proyecto TC6"
          accentColor="var(--color-amarillo)"
        />
        <KPICard
          number={statsLoading ? '…' : stats?.sello_verde ?? 0}
          label="Con Sello Verde OK"
          accentColor="var(--color-verde)"
        />
        <KPICard
          number={statsLoading ? '…' : totalAlertas}
          label="Alertas Activas"
          accentColor="var(--color-rojo)"
        />
      </div>

      {/* Upcoming Alerts Section */}
      {alertas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-lg)' }}>
            Alertas Críticas Próximas (30 días)
          </h2>
          <div style={{
            display: 'flex',
            gap: 'var(--space-3)',
            overflowX: 'auto',
            paddingBottom: 'var(--space-2)',
            scrollbarWidth: 'thin',
          }}>
            {alertas.map(alerta => (
              <AlertChip key={alerta.id} alerta={alerta} />
            ))}
          </div>
        </div>
      )}

      {/* Table Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-lg)' }}>
          Estado General de Establecimientos
        </h2>
        <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          <EstablecimientoTable
            establecimientos={establecimientos}
            loading={eeLoading}
          />
        </div>
      </div>
    </div>
  );
}
