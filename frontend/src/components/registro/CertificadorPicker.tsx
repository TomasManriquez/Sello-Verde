'use client';

import React, { useEffect, useRef, useState } from 'react';
import { certificadoresApi, Certificador } from '@/lib/api';
import { Select } from '@/components/ui/Input';
import { CertificadorFormModal } from './CertificadorFormModal';

const CLAVE_ULTIMO = 'sv_ultimo_certificador';

interface Props {
  value: number | null;
  onChange: (id: number | null) => void;
  label?: string;
  required?: boolean;
  /** Preselecciona el último certificador usado o, si hay uno solo, ese */
  autoSeleccionar?: boolean;
}

function recordarUltimo(id: number | null) {
  try {
    if (id) localStorage.setItem(CLAVE_ULTIMO, String(id));
  } catch { /* sin almacenamiento: se omite */ }
}

function ultimoGuardado(): number | null {
  try {
    const v = Number(localStorage.getItem(CLAVE_ULTIMO));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Selector de certificador con alta rápida ("+ Nuevo certificador") y memoria del último usado. */
export function CertificadorPicker({ value, onChange, label = 'Certificador', required, autoSeleccionar = true }: Props) {
  const [certificadores, setCertificadores] = useState<Certificador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const yaPreseleccion = useRef(false);

  useEffect(() => {
    certificadoresApi.list({ activo: true })
      .then((lista) => {
        setCertificadores(lista);
        if (autoSeleccionar && value === null && !yaPreseleccion.current) {
          yaPreseleccion.current = true;
          const ultimo = ultimoGuardado();
          const elegido = lista.find((c) => c.id === ultimo) ?? (lista.length === 1 ? lista[0] : undefined);
          if (elegido) onChange(elegido.id);
        }
      })
      .catch((err) => setError(err.message || 'No se pudieron cargar los certificadores'))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elegir = (id: number | null) => {
    recordarUltimo(id);
    onChange(id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <Select
        label={label}
        value={value ? String(value) : ''}
        onChange={(e) => elegir(e.target.value ? Number(e.target.value) : null)}
        required={required}
        options={[
          { value: '', label: cargando ? 'Cargando…' : '— Seleccionar certificador —' },
          ...certificadores.map((c) => ({
            value: String(c.id),
            label: [c.nombre, c.rut ? `(${c.rut})` : null, c.entidad ? `· ${c.entidad}` : null].filter(Boolean).join(' '),
          })),
        ]}
      />
      {error && <span style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>{error}</span>}
      <button
        type="button"
        onClick={() => setNuevoOpen(true)}
        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, minHeight: 32, color: 'var(--color-primary)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600 }}
      >
        + Nuevo certificador
      </button>
      <CertificadorFormModal
        open={nuevoOpen}
        onClose={() => setNuevoOpen(false)}
        onSaved={(c) => {
          setCertificadores((prev) => [...prev, c].sort((a, b) => a.nombre.localeCompare(b.nombre)));
          elegir(c.id);
        }}
      />
    </div>
  );
}
