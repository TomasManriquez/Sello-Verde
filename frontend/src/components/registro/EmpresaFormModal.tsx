'use client';

import React, { useEffect, useState } from 'react';
import { empresasApi, Empresa } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { RutInput } from '@/components/ui/RutInput';
import { Button } from '@/components/ui/Button';
import { formatearRut, rutFormatoValido } from '@/lib/rut';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Si se entrega, el formulario edita esa empresa; si no, crea una nueva */
  empresa?: Empresa | null;
  onSaved: (empresa: Empresa) => void;
}

const VACIO = { razon_social: '', rut: '', contacto: '', telefono: '', email: '' };

/** Alta y edición de una empresa contratista (la misma que usan el selector y la pantalla de mantenimiento). */
export function EmpresaFormModal({ open, onClose, empresa, onSaved }: Props) {
  const [form, setForm] = useState(VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      empresa
        ? {
            razon_social: empresa.razon_social,
            rut: formatearRut(empresa.rut ?? ''),
            contacto: empresa.contacto ?? '',
            telefono: empresa.telefono ?? '',
            email: empresa.email ?? '',
          }
        : VACIO,
    );
  }, [open, empresa]);

  const set = (campo: keyof typeof VACIO) => (valor: string) => setForm((p) => ({ ...p, [campo]: valor }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!form.razon_social.trim()) {
      setError('La razón social es obligatoria.');
      return;
    }
    if (form.rut && !rutFormatoValido(form.rut)) {
      setError('El RUT no tiene un formato válido (ej: 76.543.210-K).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const guardada = empresa
        ? await empresasApi.update(empresa.id, form)
        : await empresasApi.create(form);
      onSaved(guardada);
      onClose();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la empresa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={empresa ? 'Editar empresa' : 'Nueva empresa'}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Empresa que provee los insumos técnicos y la mano de obra de la instalación de gas.
        </p>
        {error && <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>⚠️ {Array.isArray(error) ? error.join(', ') : error}</div>}
        <Input label="Razón social" placeholder="Ej: GasControl Limitada" value={form.razon_social} onChange={(e) => set('razon_social')(e.target.value)} required />
        <RutInput label="RUT" value={form.rut} onValueChange={set('rut')} placeholder="76.543.210-K" />
        <Input label="Persona de contacto" value={form.contacto} onChange={(e) => set('contacto')(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
          <Input label="Teléfono" type="tel" value={form.telefono} onChange={(e) => set('telefono')(e.target.value)} />
          <Input label="Correo" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>{empresa ? 'Guardar cambios' : 'Crear empresa'}</Button>
        </div>
      </form>
    </Modal>
  );
}
