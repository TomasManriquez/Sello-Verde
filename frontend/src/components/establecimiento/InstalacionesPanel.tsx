'use client';

import React from 'react';
import { Trash } from 'lucide-react';
import { Establecimiento, Local, Instalacion, SelloInstalacion } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate, getUrgencyColor } from '@/lib/constants';

interface Props {
  ee: Establecimiento;
  /** Sin expediente no se puede registrar inspecciones */
  expedienteId?: number;
  onAddLocal: () => void;
  onAddInstalacion: (localId: number) => void;
  onEliminarLocal: (local: Local) => void;
  onEliminarInstalacion: (inst: Instalacion, local: Local) => void;
}

function SelloCelda({ sello }: { sello?: SelloInstalacion | null }) {
  if (!sello || sello.estado_sello === 'sin_inspeccion' || !sello.tipo_sello) {
    return <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>Sin inspección</span>;
  }
  if (sello.estado_sello === 'verde_vencido') {
    return <span className="badge badge-rojo">Verde vencido</span>;
  }
  return <Badge estado={sello.tipo_sello} />;
}

function LimiteCelda({ sello }: { sello?: SelloInstalacion | null }) {
  if (!sello || !sello.fecha_limite || sello.dias_restantes === null) {
    return <span style={{ color: 'var(--color-text-subtle)' }}>—</span>;
  }
  const dias = sello.dias_restantes;
  const esVerde = sello.tipo_sello === 'verde';
  const color = getUrgencyColor(dias);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
        {esVerde ? 'Vence' : 'Plazo hasta'} {formatDate(sello.fecha_limite)}
      </span>
      <strong style={{ color, fontSize: 'var(--text-sm)' }}>
        {dias < 0 ? `Vencido hace ${Math.abs(dias)} d` : `${dias} días`}
      </strong>
    </div>
  );
}

function descripcion(inst: Instalacion) {
  return [inst.zona_abastecimiento, inst.referencia].filter(Boolean).join(' · ') || 'Sin descripción';
}

function equipo(inst: Instalacion) {
  return [inst.tipo_gas, inst.abastecimiento, inst.artefacto_cilindro].filter(Boolean).join(' · ') || '—';
}

export function InstalacionesPanel({ ee, expedienteId, onAddLocal, onAddInstalacion, onEliminarLocal, onEliminarInstalacion }: Props) {
  const locales: Local[] = [...(ee.locales ?? [])].sort((a, b) => a.numero_local - b.numero_local);

  const hrefInspeccion = (instalacionId: number) =>
    `/expedientes/${expedienteId}/certificacion?instalacion=${instalacionId}`;

  return (
    <section className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', margin: 0 }}>
            Instalaciones de gas
          </h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Cada instalación tiene su propio sello, plazo y alerta.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={onAddLocal}>+ Agregar local</Button>
          {locales.length > 0 && (
            <Button as="a" href={`/establecimientos/${ee.id}/anexo2`} variant="ghost" size="sm">
              Editar levantamiento (Anexo 2)
            </Button>
          )}
        </div>
      </div>

      {locales.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
          <span className="empty-state-icon">🏢</span>
          <p style={{ margin: 0 }}>Aún no hay locales registrados.</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
            Agrega los locales del establecimiento y luego las instalaciones de gas de cada uno.
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Local</th>
                <th>Instalación</th>
                <th>Gas / Abastecimiento</th>
                <th>Sello</th>
                <th>Plazo</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {locales.map((local) => {
                const insts = local.instalaciones ?? [];
                const celdaLocal = (
                  <td style={{ verticalAlign: 'top' }} rowSpan={Math.max(insts.length, 1)}>
                    <div style={{ fontWeight: 700 }}>Local {local.numero_local}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{local.nombre}</div>
                    {local.direccion && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{local.direccion}</div>
                    )}
                    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-1)' }}>
                      {local.usa_gas && insts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onAddInstalacion(local.id)}
                          style={{ background: 'none', border: 'none', padding: 0, minHeight: 28, color: 'var(--color-primary)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600 }}
                        >
                          + Instalación
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEliminarLocal(local)}
                        aria-label={`Eliminar local ${local.numero_local}`}
                        style={{ background: 'none', border: 'none', padding: 0, minHeight: 28, color: 'var(--color-rojo)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600 }}
                      >
                        Eliminar local
                      </button>
                    </div>
                  </td>
                );

                if (!local.usa_gas) {
                  return (
                    <tr key={local.id}>
                      {celdaLocal}
                      <td colSpan={5} style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                        Este local no usa gas: no tiene instalaciones que certificar.
                      </td>
                    </tr>
                  );
                }

                if (insts.length === 0) {
                  return (
                    <tr key={local.id}>
                      {celdaLocal}
                      <td colSpan={5}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginRight: 'var(--space-3)' }}>
                          Sin instalaciones registradas.
                        </span>
                        <Button variant="secondary" size="sm" onClick={() => onAddInstalacion(local.id)}>
                          + Agregar instalación
                        </Button>
                      </td>
                    </tr>
                  );
                }

                return insts.map((inst, i) => (
                  <tr key={inst.id}>
                    {i === 0 && celdaLocal}
                    <td>
                      <div style={{ fontWeight: 600 }}>{descripcion(inst)}</div>
                    </td>
                    <td style={{ fontSize: 'var(--text-sm)' }}>{equipo(inst)}</td>
                    <td><SelloCelda sello={inst.sello} /></td>
                    <td><LimiteCelda sello={inst.sello} /></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {expedienteId ? (
                        <Button as="a" href={hrefInspeccion(inst.id)} variant="secondary" size="sm">
                          Registrar inspección
                        </Button>
                      ) : (
                        <span style={{ color: 'var(--color-text-subtle)', fontSize: 'var(--text-xs)' }}>Inicia la gestión</span>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onEliminarInstalacion(inst, local)}
                        aria-label="Eliminar instalación"
                        title="Eliminar instalación"
                        style={{ color: 'var(--color-rojo)', minWidth: 44, minHeight: 44, marginLeft: 'var(--space-1)' }}
                      >
                        <Trash size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
