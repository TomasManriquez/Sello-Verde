'use client';

import React, { useEffect, useState } from 'react';
import { certificadoresApi, Certificador } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { RutInput } from '@/components/ui/RutInput';
import { Button } from '@/components/ui/Button';
import { formatearRut, rutFormatoValido } from '@/lib/rut';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Si se entrega, el formulario edita ese certificador; si no, crea uno nuevo */
  certificador?: Certificador | null;
  onSaved: (certificador: Certificador) => void;
}

const VACIO = { nombre: '', rut: '', entidad: '', telefono: '', email: '' };

/** Alta y edición de un certificador (persona que valida la instalación). */
export function CertificadorFormModal({ open, onClose, certificador, onSaved }: Props) {
  const [form, setForm] = useState(VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      certificador
        ? {
            nombre: certificador.nombre,
            rut: formatearRut(certificador.rut ?? ''),
            entidad: certificador.entidad ?? '',
            telefono: certificador.telefono ?? '',
            email: certificador.email ?? '',
          }
        : VACIO,
    );
  }, [open, certificador]);

  const set = (campo: keyof typeof VACIO) => (valor: string) => setForm((p) => ({ ...p, [campo]: valor }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (form.rut && !rutFormatoValido(form.rut)) {
      setError('El RUT no tiene un formato válido (ej: 12.345.678-9).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const guardado = certificador
        ? await certificadoresApi.update(certificador.id, form)
        : await certificadoresApi.create(form);
      onSaved(guardado);
      onClose();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el certificador');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={certificador ? 'Editar certificador' : 'Nuevo certificador'}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Persona que valida la instalación de gas. No depende de la empresa contratista.
        </p>
        {error && <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>⚠️ {error}</div>}
        <Input label="Nombre completo" placeholder="Ej: Ing. María González" value={form.nombre} onChange={(e) => set('nombre')(e.target.value)} required />
        <RutInput label="RUT" value={form.rut} onValueChange={set('rut')} />
        <Input label="Entidad u organismo (opcional)" placeholder="Ej: SEC Chile" value={form.entidad} onChange={(e) => set('entidad')(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
          <Input label="Teléfono" type="tel" value={form.telefono} onChange={(e) => set('telefono')(e.target.value)} />
          <Input label="Correo" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>{certificador ? 'Guardar cambios' : 'Crear certificador'}</Button>
        </div>
      </form>
    </Modal>
  );
}
