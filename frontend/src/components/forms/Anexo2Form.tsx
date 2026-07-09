'use client';

import React, { useState } from 'react';
import { Establecimiento, Local, Instalacion, localesApi, ApiError } from '@/lib/api';
import {
  TIPO_GAS_OPTIONS,
  ABASTECIMIENTO_OPTIONS,
  ZONA_OPTIONS,
  formatDate,
} from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

interface Anexo2FormProps {
  establecimiento: Establecimiento;
  locales: Local[];
  onSaved?: () => void;
}

export function Anexo2Form({ establecimiento, locales: initialLocales, onSaved }: Anexo2FormProps) {
  const [locales, setLocales]   = useState<Local[]>(initialLocales);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  // ── Section B handlers ────────────────────────────────────
  const updateLocal = (id: number, field: keyof Local, value: unknown) => {
    setLocales(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  // ── Section C handlers ────────────────────────────────────
  const addInstalacion = (localId: number) => {
    setLocales(prev => prev.map(l => {
      if (l.id !== localId) return l;
      const newInst: Instalacion = {
        id: Date.now(), // temp id
        local_id: localId,
        tipo_gas: TIPO_GAS_OPTIONS[0],
        abastecimiento: ABASTECIMIENTO_OPTIONS[0],
        zona: ZONA_OPTIONS[0],
        referencia: '',
        artefacto: '',
      };
      return { ...l, instalaciones: [...(l.instalaciones ?? []), newInst] };
    }));
  };

  const updateInstalacion = (localId: number, instId: number, field: keyof Instalacion, value: string) => {
    setLocales(prev => prev.map(l => {
      if (l.id !== localId) return l;
      return {
        ...l,
        instalaciones: (l.instalaciones ?? []).map(inst =>
          inst.id === instId ? { ...inst, [field]: value } : inst
        ),
      };
    }));
  };

  const removeInstalacion = (localId: number, instId: number) => {
    setLocales(prev => prev.map(l => {
      if (l.id !== localId) return l;
      return { ...l, instalaciones: (l.instalaciones ?? []).filter(inst => inst.id !== instId) };
    }));
  };

  // ── Save ──────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const local of locales) {
        await localesApi.update(local.id, {
          nombre:   local.nombre,
          direccion: local.direccion,
          usa_gas:  local.usa_gas,
        });

        if (local.usa_gas && local.instalaciones) {
          for (const inst of local.instalaciones) {
            await localesApi.addInstalacion(local.id, {
              tipo_gas:      inst.tipo_gas,
              abastecimiento:inst.abastecimiento,
              zona:          inst.zona,
              referencia:    inst.referencia,
              artefacto:     inst.artefacto,
            });
          }
        }
      }
      setSuccess(true);
      onSaved?.();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Error al guardar el formulario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>

      {/* Section A: General Info */}
      <section className="surface p-6">
        <h2 className="section-title mb-4">A — Información General del Establecimiento</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="label">RBD</label>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, padding: '0.625rem var(--space-3)' }}>
              {establecimiento.rbd}
            </div>
          </div>
          <div className="form-group">
            <label className="label">Nombre Establecimiento</label>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, padding: '0.625rem var(--space-3)' }}>
              {establecimiento.nombre}
            </div>
          </div>
          <div className="form-group">
            <label className="label">Dirección</label>
            <div style={{ fontSize: 'var(--text-sm)', padding: '0.625rem var(--space-3)', color: 'var(--color-text-muted)' }}>
              {establecimiento.direccion}
            </div>
          </div>
          <div className="form-group">
            <label className="label">Propietario</label>
            <div style={{ fontSize: 'var(--text-sm)', padding: '0.625rem var(--space-3)', color: 'var(--color-text-muted)' }}>
              {establecimiento.propietario}
            </div>
          </div>
          <div className="form-group">
            <label className="label">Fecha</label>
            <div style={{ fontSize: 'var(--text-sm)', padding: '0.625rem var(--space-3)', color: 'var(--color-text-muted)' }}>
              {formatDate(new Date().toISOString())}
            </div>
          </div>
          <div className="form-group">
            <label className="label">Cantidad de Locales</label>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, padding: '0.625rem var(--space-3)', color: 'var(--color-primary)' }}>
              {locales.length}
            </div>
          </div>
        </div>
      </section>

      {/* Section B: Locales */}
      <section className="surface p-6">
        <h2 className="section-title mb-4">B — Detalle de Locales</h2>
        <div className="table-wrapper inline-table">
          <table>
            <thead>
              <tr>
                <th>N° Local</th>
                <th>Nombre Local</th>
                <th>Dirección Local</th>
                <th>¿Usa Gas?</th>
              </tr>
            </thead>
            <tbody>
              {locales.map(local => (
                <tr key={local.id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {local.numero_local}
                  </td>
                  <td>
                    <input
                      value={local.nombre}
                      onChange={e => updateLocal(local.id, 'nombre', e.target.value)}
                      placeholder="Nombre del local"
                    />
                  </td>
                  <td>
                    <input
                      value={local.direccion}
                      onChange={e => updateLocal(local.id, 'direccion', e.target.value)}
                      placeholder="Dirección"
                    />
                  </td>
                  <td>
                    <label className="toggle-wrapper">
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={local.usa_gas}
                          onChange={e => updateLocal(local.id, 'usa_gas', e.target.checked)}
                        />
                        <div className="toggle-track" />
                        <div className="toggle-thumb" />
                      </label>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {local.usa_gas ? 'Sí' : 'No'}
                      </span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section C: Instalaciones per local */}
      {locales.filter(l => l.usa_gas).map(local => (
        <section key={local.id} className="surface p-6">
          <div className="section-header">
            <h2 className="section-title">
              C — Instalaciones: Local {local.numero_local} — {local.nombre || 'Sin nombre'}
            </h2>
            <Button variant="secondary" size="sm" onClick={() => addInstalacion(local.id)}>
              + Agregar instalación
            </Button>
          </div>

          {(!local.instalaciones || local.instalaciones.length === 0) ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                No hay instalaciones. Haz clic en &ldquo;Agregar instalación&rdquo;.
              </p>
            </div>
          ) : (
            <div className="table-wrapper inline-table" style={{ marginTop: 'var(--space-4)' }}>
              <table>
                <thead>
                  <tr>
                    <th>Tipo Gas</th>
                    <th>Abastecimiento</th>
                    <th>Zona</th>
                    <th>Referencia</th>
                    <th>Artefacto/Cilindro</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(local.instalaciones ?? []).map(inst => (
                    <tr key={inst.id}>
                      <td>
                        <select
                          value={inst.tipo_gas}
                          onChange={e => updateInstalacion(local.id, inst.id, 'tipo_gas', e.target.value)}
                        >
                          {TIPO_GAS_OPTIONS.map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={inst.abastecimiento}
                          onChange={e => updateInstalacion(local.id, inst.id, 'abastecimiento', e.target.value)}
                        >
                          {ABASTECIMIENTO_OPTIONS.map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={inst.zona}
                          onChange={e => updateInstalacion(local.id, inst.id, 'zona', e.target.value)}
                        >
                          {ZONA_OPTIONS.map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          value={inst.referencia}
                          onChange={e => updateInstalacion(local.id, inst.id, 'referencia', e.target.value)}
                          placeholder="Descripción de ubicación"
                        />
                      </td>
                      <td>
                        <input
                          value={inst.artefacto}
                          onChange={e => updateInstalacion(local.id, inst.id, 'artefacto', e.target.value)}
                          placeholder="Ej. cocina-calefón"
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeInstalacion(local.id, inst.id)}
                          style={{ color: 'var(--color-rojo)', minWidth: 36, minHeight: 36 }}
                          title="Eliminar instalación"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {/* Actions */}
      {error && (
        <div className="inline-alert inline-alert-error">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="inline-alert inline-alert-success">
          <span>✓</span>
          <span>Formulario guardado correctamente</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
        <Button variant="primary" size="lg" loading={saving} onClick={handleSave}>
          Guardar Anexo 2
        </Button>
      </div>
    </div>
  );
}
