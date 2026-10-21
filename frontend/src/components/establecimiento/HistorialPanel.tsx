'use client';

import React, { useState } from 'react';
import { Pencil, Trash } from 'lucide-react';
import { alertasApi, certificacionesApi, Alerta, Certificacion, UpdateCertificacionPayload } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { CertificadorPicker } from '@/components/registro/CertificadorPicker';
import { ALERTA_TIPOS, diasRestantesAlerta, formatDate, instalacionLabel } from '@/lib/constants';

interface Props {
  certificaciones: Certificacion[];
  alertas: Alerta[];
  onChanged: () => void;
}

/** Historial del expediente: inspecciones realizadas y registro de alertas (vigentes y resueltas). */
export function HistorialPanel({ certificaciones, alertas, onChanged }: Props) {
  const [editCert, setEditCert] = useState<Certificacion | null>(null);
  const [form, setForm] = useState<UpdateCertificacionPayload>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [alertaError, setAlertaError] = useState<string | null>(null);
  const [alertaBusy, setAlertaBusy] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Alerta | null>(null);

  const abrirEdicion = (c: Certificacion) => {
    setEditCert(c);
    setEditError(null);
    setForm({
      certificador_id: c.certificador_id ?? undefined,
      fecha_inspeccion: c.fecha_inspeccion?.slice(0, 10) ?? '',
      numero_certificado: c.numero_certificado ?? '',
      observaciones: c.observaciones ?? '',
    });
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editCert) return;
    setSaving(true);
    setEditError(null);
    try {
      await certificacionesApi.update(editCert.id, form);
      setEditCert(null);
      onChanged();
    } catch (err: any) {
      setEditError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const resolver = async (a: Alerta) => {
    setAlertaBusy(a.id);
    setAlertaError(null);
    try {
      await alertasApi.marcarResuelta(a.id);
      onChanged();
    } catch (err: any) {
      setAlertaError(err.message || 'Error al resolver la alerta');
    } finally {
      setAlertaBusy(null);
    }
  };

  const eliminar = async () => {
    if (!deleteTarget) return;
    setAlertaBusy(deleteTarget.id);
    setAlertaError(null);
    try {
      await alertasApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      onChanged();
    } catch (err: any) {
      setAlertaError(err.message || 'Error al eliminar la alerta');
    } finally {
      setAlertaBusy(null);
    }
  };

  const titulo: React.CSSProperties = { fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', margin: 0 };
  const fila: React.CSSProperties = { padding: 'var(--space-3) var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' };
  const sub: React.CSSProperties = { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' };

  return (
    <section className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Inspecciones */}
      <div>
        <h2 style={{ ...titulo, borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          Historial de inspecciones ({certificaciones.length})
        </h2>
        {certificaciones.length === 0 ? (
          <p style={{ ...sub, margin: 0 }}>Aún no hay inspecciones registradas.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {certificaciones.map((c) => {
              const donde =
                instalacionLabel(c.instalacion ? { ...c.instalacion, local: c.local } : c.local ? { local: c.local } : null) ||
                (c.instalacion_id ? 'Instalación eliminada' : '');
              const nombre = c.certificador?.nombre ?? c.nombre_inspector;
              const entidad = c.certificador?.entidad ?? c.entidad_certificadora;
              return (
                <div key={c.id} style={fila}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      {formatDate(c.fecha_inspeccion)}{donde ? ` — ${donde}` : ''}
                    </div>
                    <div style={sub}>
                      {nombre || 'Certificador no registrado'}
                      {entidad ? ` (${entidad})` : ''}
                      {c.numero_certificado ? ` · N° ${c.numero_certificado}` : ''}
                      {c.defectos && c.defectos.length > 0 ? ` · ${c.defectos.length} defecto(s)` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Badge estado={c.tipo_sello} />
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicion(c)} aria-label="Editar inspección"><Pencil size={16} aria-hidden="true" /> Editar</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alertas */}
      <div>
        <h2 style={{ ...titulo, borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          Registro de alertas ({alertas.length})
        </h2>
        {alertaError && <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>⚠️ {alertaError}</div>}
        {alertas.length === 0 ? (
          <p style={{ ...sub, margin: 0 }}>Este establecimiento no tiene alertas.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {alertas.map((a) => {
              const dias = diasRestantesAlerta(a);
              const resuelta = a.estado === 'resuelta';
              const donde = instalacionLabel(a.instalacion);
              return (
                <div key={a.id} style={{ ...fila, opacity: resuelta ? 0.65 : 1 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      {ALERTA_TIPOS[a.tipo as keyof typeof ALERTA_TIPOS] ?? a.tipo}
                    </div>
                    {donde && <div style={{ fontSize: 'var(--text-xs)' }}>{donde}</div>}
                    <div style={sub}>
                      Vence: {formatDate(a.fecha_vencimiento)}
                      {!resuelta && (
                        <span style={{ marginLeft: 'var(--space-2)', color: dias < 30 ? 'var(--color-rojo)' : 'inherit' }}>
                          ({dias < 0 ? `vencida hace ${Math.abs(dias)} d` : `${dias} días restantes`})
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Badge estado={a.estado} />
                    {!resuelta && (
                      <Button variant="secondary" size="sm" loading={alertaBusy === a.id} onClick={() => resolver(a)} title="Solo si la instalación ya tiene un Sello Verde posterior">
                        ✓ Resolver
                      </Button>
                    )}
                    {resuelta && (
                      <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(a); setAlertaError(null); }} aria-label="Eliminar alerta resuelta" style={{ color: 'var(--color-rojo)' }}>
                        <Trash size={16} aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: editar inspección */}
      <Modal open={!!editCert} onClose={() => setEditCert(null)} title="Editar inspección" maxWidth="520px">
        {editCert && (
          <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <CertificadorPicker
              value={form.certificador_id ?? null}
              onChange={(id) => setForm((p) => ({ ...p, certificador_id: id ?? undefined }))}
              autoSeleccionar={false}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
              <Input label="Fecha inspección" type="date" value={form.fecha_inspeccion ?? ''} onChange={(e) => setForm((p) => ({ ...p, fecha_inspeccion: e.target.value }))} />
              <Input label="N° certificado" value={form.numero_certificado ?? ''} onChange={(e) => setForm((p) => ({ ...p, numero_certificado: e.target.value }))} />
            </div>
            <Input label="Observaciones" value={form.observaciones ?? ''} onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))} />
            {editError && <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>⚠️ {editError}</div>}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={() => setEditCert(null)} disabled={saving}>Cancelar</Button>
              <Button type="submit" loading={saving}>Guardar cambios</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: eliminar alerta resuelta */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar alerta" maxWidth="420px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            ¿Confirmas eliminar esta alerta resuelta? El registro se conserva en la base de datos (soft delete).
          </p>
          {alertaError && <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>⚠️ {alertaError}</div>}
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={alertaBusy !== null}>Cancelar</Button>
            <Button variant="danger" onClick={eliminar} loading={alertaBusy !== null}>Eliminar</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
