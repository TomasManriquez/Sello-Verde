'use client';

import React, { useEffect, useState } from 'react';
import { expedientesApi, Expediente } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { ESTADO_GENERAL, TC6_ESTADOS } from '@/lib/constants';

export default function ExpedientesPage() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadoFilter, setEstadoFilter] = useState('');

  const loadData = () => {
    setLoading(true);
    expedientesApi.list({
      estado_general: estadoFilter || undefined,
    })
      .then(data => {
        setExpedientes(data);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Error al cargar expedientes');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [estadoFilter]);

  const getTc6StepIndex = (estado: string) => {
    return TC6_ESTADOS.findIndex(s => s.key === estado);
  };

  const estadoOptions = Object.entries(ESTADO_GENERAL).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header & Filter bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)' }}>
            Expedientes de Regularización
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Seguimiento de licitaciones, avance de proyectos TC6 ante la SEC y certificaciones de gas.
          </p>
        </div>

        <div style={{ minWidth: 200 }}>
          <Select
            label=""
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value)}
            options={[{ value: '', label: 'Todos los estados' }, ...estadoOptions]}
            placeholder="Filtrar por estado"
          />
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--color-rojo)', background: 'oklch(75% 0.1 20 / 0.1)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : expedientes.length === 0 ? (
        <div className="empty-state surface" style={{ height: 200 }}>
          <span className="empty-state-icon">📂</span>
          <p>No se encontraron expedientes activos.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {expedientes.map((exp, i) => {
            const stepIndex = getTc6StepIndex(exp.estado_tc6);
            const activeAlerts = exp.alertas?.filter(a => a.estado === 'activa').length ?? 0;

            return (
              <div
                key={exp.id}
                className="surface animate-fade-up"
                style={{
                  padding: 'var(--space-4) var(--space-6)',
                  borderRadius: 'var(--radius-xl)',
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 2fr 1fr',
                  alignItems: 'center',
                  gap: 'var(--space-6)',
                  animationDelay: `${i * 50}ms`,
                }}
              >
                {/* School & Contractor Info */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <Badge estado={exp.estado_general} />
                    {activeAlerts > 0 && (
                      <span style={{
                        background: 'var(--color-rojo-bg)',
                        color: 'var(--color-rojo)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        padding: '0.125rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        ⚠️ {activeAlerts} alert{activeAlerts > 1 ? 'as' : 'a'}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 'var(--text-base)', margin: '0 0 var(--space-1) 0' }}>
                    {exp.establecimiento?.nombre || `Establecimiento #${exp.establecimiento_id}`}
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
                    Empresa: <strong>{exp.empresa_instaladora}</strong>
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                    RUT: {exp.rut_empresa}
                  </p>
                </div>

                {/* TC6 Progress Stepper */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    Progreso TC6 (SEC)
                  </span>
                  <div style={{ display: 'flex', gap: '4px', height: '8px', background: 'var(--color-surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
                    {TC6_ESTADOS.map((s, idx) => {
                      let bg = 'transparent';
                      if (idx <= stepIndex) {
                        bg = exp.estado_tc6 === 'observado' ? 'var(--color-rojo)' : 'var(--color-primary)';
                      }
                      return (
                        <div
                          key={s.key}
                          style={{
                            flex: 1,
                            background: bg,
                            transition: 'background 0.3s ease',
                          }}
                          title={s.label}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    <span>Sin Iniciar</span>
                    <strong style={{ color: exp.estado_tc6 === 'observado' ? 'var(--color-rojo)' : 'var(--color-primary)' }}>
                      Etapa: {TC6_ESTADOS[stepIndex]?.label}
                    </strong>
                    <span>Aprobado</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                  <Button
                    as="a"
                    href={`/expedientes/${exp.id}`}
                    variant="secondary"
                    size="sm"
                    style={{ textAlign: 'center' }}
                  >
                    Detalle Expediente
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
