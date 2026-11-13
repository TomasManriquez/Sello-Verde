'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Establecimiento } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { instalacionLabel } from '@/lib/constants';

interface Props {
  open: boolean;
  onClose: () => void;
  establecimientos: Establecimiento[];
}

/** Atajo del tablero: elegir establecimiento e instalación y pasar directo al registro de la inspección. */
export function RegistrarInspeccionModal({ open, onClose, establecimientos }: Props) {
  const router = useRouter();
  const [eeId, setEeId] = useState('');
  const [instId, setInstId] = useState('');

  // Solo establecimientos con gestión iniciada y al menos una instalación en un local con gas
  const candidatos = useMemo(
    () =>
      establecimientos.filter(
        (e) => e.expediente_activo && (e.locales ?? []).some((l) => l.usa_gas && (l.instalaciones?.length ?? 0) > 0),
      ),
    [establecimientos],
  );

  const ee = candidatos.find((e) => String(e.id) === eeId);
  const instalaciones = (ee?.locales ?? [])
    .filter((l) => l.usa_gas)
    .flatMap((l) => (l.instalaciones ?? []).map((i) => ({ ...i, local: l })));

  const elegirEe = (value: string) => {
    setEeId(value);
    const e = candidatos.find((c) => String(c.id) === value);
    const todas = (e?.locales ?? []).filter((l) => l.usa_gas).flatMap((l) => l.instalaciones ?? []);
    setInstId(todas.length === 1 ? String(todas[0].id) : '');
  };

  const continuar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ee?.expediente_activo || !instId) return;
    router.push(`/expedientes/${ee.expediente_activo.id}/certificacion?instalacion=${instId}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar inspección">
      <form onSubmit={continuar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          El sello se registra por instalación. Solo aparecen establecimientos con la gestión iniciada y al menos una instalación de gas.
        </p>
        <Select
          label="Establecimiento"
          value={eeId}
          onChange={(e) => elegirEe(e.target.value)}
          options={[{ value: '', label: '— Seleccionar establecimiento —' }, ...candidatos.map((c) => ({ value: String(c.id), label: `${c.nombre} (RBD ${c.rbd})` }))]}
          required
        />
        {ee && (
          <Select
            label="Instalación"
            value={instId}
            onChange={(e) => setInstId(e.target.value)}
            options={[
              { value: '', label: '— Seleccionar instalación —' },
              ...instalaciones.map((i) => ({ value: String(i.id), label: instalacionLabel(i) || `Instalación #${i.id}` })),
            ]}
            required
          />
        )}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={!ee || !instId}>Continuar</Button>
        </div>
      </form>
    </Modal>
  );
}
