'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Qué se elimina: "empresa" o "certificador" */
  tipo: string;
  nombre: string;
  onConfirm: () => Promise<void>;
}

/** Confirmación para eliminar una empresa o un certificador del registro. */
export function ConfirmarEliminarModal({ open, onClose, tipo, nombre, onConfirm }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const confirmar = async () => {
    setSaving(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || `No se pudo eliminar la ${tipo}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Eliminar ${tipo}`} maxWidth="460px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
          ¿Eliminar <strong>{nombre}</strong> del registro?
        </p>
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Dejará de ofrecerse al iniciar una gestión o registrar una inspección. Si ya aparece en el historial de algún
          establecimiento, su nombre se conserva allí.
        </p>
        {error && <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>⚠️ {error}</div>}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="danger" onClick={confirmar} loading={saving}>Eliminar</Button>
        </div>
      </div>
    </Modal>
  );
}
