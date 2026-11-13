'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { expedientesApi, Expediente } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { Modal } from '@/components/ui/Modal';
import { EmpresaPicker } from '@/components/registro/EmpresaPicker';
import { puede } from '@/lib/capacidades';

interface Props {
  expediente: Expediente;
  onChanged: () => void;
  /** Permite que el encabezado dispare el avance de TC6 (acción primaria de la ficha) */
  advanceRef?: React.MutableRefObject<((estado: string) => Promise<void>) | null>;
}

export function ProyectoPanel({ expediente, onChanged, advanceRef }: Props) {
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const avanzar = async (estado: string) => {
    setError(null);
    try {
      await expedientesApi.advanceTc6(expediente.id, estado);
      onChanged();
    } catch (err: any) {
      setError(err.message || 'Error al avanzar el estado TC6');
    }
  };
  if (advanceRef) advanceRef.current = avanzar;

  const abrirEdicion = () => {
    setEmpresaId(expediente.empresa_id ?? null);
    setEditError(null);
    setEditOpen(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!empresaId) {
      setEditError('Selecciona la empresa contratista.');
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await expedientesApi.update(expediente.id, { empresa_id: empresaId });
      setEditOpen(false);
      onChanged();
    } catch (err: any) {
      setEditError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const empresa = expediente.empresa;
  const dato = (label: string, valor?: string | null) =>
    valor ? (
      <div>
        <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>{label}</span>
        <strong>{valor}</strong>
      </div>
    ) : null;

  return (
    <section className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', margin: 0 }}>
          Proyecto y contratista
        </h2>
        {puede('write') && <Button variant="ghost" size="sm" onClick={abrirEdicion}>Cambiar empresa</Button>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
        {empresa ? (
          <>
            {dato('Empresa contratista', empresa.razon_social)}
            {dato('RUT', empresa.rut)}
            {dato('Contacto', empresa.contacto)}
            {dato('Teléfono', empresa.telefono)}
            {dato('Correo', empresa.email)}
          </>
        ) : (
          <>
            {dato('Empresa contratista', expediente.empresa_instaladora) ?? (
              <span style={{ color: 'var(--color-text-muted)' }}>Sin empresa asignada.</span>
            )}
            {dato('RUT', expediente.rut_empresa)}
          </>
        )}
        {!empresa && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Asigna una empresa del registro para reutilizar sus datos en otros establecimientos.
          </span>
        )}
        <Link href="/empresas" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 600 }}>
          Ver empresas y certificadores →
        </Link>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-3)' }}>
          Proyecto de diseño TC6 ante la SEC
        </span>
        <Stepper current={expediente.estado_tc6} />

        <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' }}>
          El estado avanza desde “Siguiente paso”, arriba.
        </span>
        {error && (
          <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>⚠️ {error}</div>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Cambiar empresa contratista">
        <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {editError && <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>⚠️ {editError}</div>}
          <EmpresaPicker value={empresaId} onChange={setEmpresaId} required autoSeleccionar={false} />
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
