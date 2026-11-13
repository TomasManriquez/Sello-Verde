'use client';

import React, { useEffect, useRef, useState } from 'react';
import { empresasApi, Empresa } from '@/lib/api';
import { Select } from '@/components/ui/Input';
import { EmpresaFormModal } from './EmpresaFormModal';

const CLAVE_ULTIMA = 'sv_ultima_empresa';

interface Props {
  value: number | null;
  onChange: (id: number | null) => void;
  label?: string;
  required?: boolean;
  /** Preselecciona la última empresa usada o, si hay una sola, esa */
  autoSeleccionar?: boolean;
}

function recordarUltima(id: number | null) {
  try {
    if (id) localStorage.setItem(CLAVE_ULTIMA, String(id));
  } catch { /* sin almacenamiento: se omite */ }
}

function ultimaGuardada(): number | null {
  try {
    const v = Number(localStorage.getItem(CLAVE_ULTIMA));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Selector de empresa contratista con alta rápida ("+ Nueva empresa") y memoria de la última usada. */
export function EmpresaPicker({ value, onChange, label = 'Empresa contratista', required, autoSeleccionar = true }: Props) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const yaPreseleccion = useRef(false);

  useEffect(() => {
    empresasApi.list({ activa: true })
      .then((lista) => {
        setEmpresas(lista);
        if (autoSeleccionar && value === null && !yaPreseleccion.current) {
          yaPreseleccion.current = true;
          const ultima = ultimaGuardada();
          const elegida = lista.find((e) => e.id === ultima) ?? (lista.length === 1 ? lista[0] : undefined);
          if (elegida) onChange(elegida.id);
        }
      })
      .catch((err) => setError(err.message || 'No se pudieron cargar las empresas'))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elegir = (id: number | null) => {
    recordarUltima(id);
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
          { value: '', label: cargando ? 'Cargando…' : '— Seleccionar empresa —' },
          ...empresas.map((e) => ({ value: String(e.id), label: e.rut ? `${e.razon_social} (${e.rut})` : e.razon_social })),
        ]}
      />
      {error && <span style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>{error}</span>}
      <button
        type="button"
        onClick={() => setNuevaOpen(true)}
        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, minHeight: 32, color: 'var(--color-primary)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600 }}
      >
        + Nueva empresa
      </button>
      <EmpresaFormModal
        open={nuevaOpen}
        onClose={() => setNuevaOpen(false)}
        onSaved={(e) => {
          setEmpresas((prev) => [...prev, e].sort((a, b) => a.razon_social.localeCompare(b.razon_social)));
          elegir(e.id);
        }}
      />
    </div>
  );
}
