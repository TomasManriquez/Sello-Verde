'use client';

import React, { useState } from 'react';
import { useAlertas } from '@/hooks/useAlertas';
import { AlertaTable } from '@/components/tables/AlertaTable';
import { Select } from '@/components/ui/Input';

export default function AlertasPage() {
  const [tipoFilter, setTipoFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  const { alertas, loading, error, marcarResuelta } = useAlertas({
    tipo: tipoFilter || undefined,
    estado: estadoFilter || undefined,
  });

  const tipoOptions = [
    { value: 'vencimiento_sello_verde', label: 'Vencimiento Sello Verde (2 años)' },
    { value: 'plazo_regularizacion_90d', label: 'Plazo de Regularización (90 días)' },
  ];

  const estadoOptions = [
    { value: 'activa', label: 'Activa' },
    { value: 'notificada', label: 'Notificada (<30 días)' },
    { value: 'resuelta', label: 'Resuelta / Subsanada' },
    { value: 'vencida', label: 'Vencida / Fuera de Plazo' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
      {/* Filters Sidebar */}
      <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', position: 'sticky', top: 'var(--space-4)' }}>
        <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
          Filtros de Alertas
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Select
            label="Tipo de Alerta"
            value={tipoFilter}
            onChange={e => setTipoFilter(e.target.value)}
            options={[{ value: '', label: 'Todos los tipos' }, ...tipoOptions]}
          />

          <Select
            label="Estado"
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value)}
            options={[{ value: '', label: 'Todos los estados' }, ...estadoOptions]}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)' }}>
            Panel de Alertas y Vencimientos
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Supervise los plazos críticos de re-inspección y regularización de defectos en la red.
          </p>
        </div>

        {error && (
          <div style={{ color: 'var(--color-rojo)', background: 'oklch(75% 0.1 20 / 0.1)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
            {error}
          </div>
        )}

        <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          <AlertaTable
            alertas={alertas}
            loading={loading}
            onMarcarResuelta={marcarResuelta}
          />
        </div>
      </div>
    </div>
  );
}
