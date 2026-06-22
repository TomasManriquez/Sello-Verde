'use client';

import React, { useState } from 'react';
import { DEFECTOS_ANEXO3 } from '@/lib/constants';

export interface Defecto {
  id: string;
  marcado: boolean;
  instalacion_afectada: string;
}

interface Anexo3FormProps {
  onChange: (defectos: Defecto[]) => void;
}

export function Anexo3Form({ onChange }: Anexo3FormProps) {
  const [defectos, setDefectos] = useState<Defecto[]>(
    DEFECTOS_ANEXO3.map(d => ({ id: d.id, marcado: false, instalacion_afectada: '' }))
  );

  const toggleDefecto = (id: string) => {
    const updated = defectos.map(d =>
      d.id === id ? { ...d, marcado: !d.marcado } : d
    );
    setDefectos(updated);
    onChange(updated);
  };

  const updateText = (id: string, text: string) => {
    const updated = defectos.map(d =>
      d.id === id ? { ...d, instalacion_afectada: text } : d
    );
    setDefectos(updated);
    onChange(updated);
  };

  const marked = defectos.filter(d => d.marcado).length;

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-1)' }}>
          Checklist de Defectos — Anexo 3 SEC
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Marque los defectos encontrados e ingrese la instalación afectada.
          {marked > 0 && (
            <span style={{ color: 'var(--color-rojo)', fontWeight: 600, marginLeft: 'var(--space-2)' }}>
              {marked} defecto{marked > 1 ? 's' : ''} marcado{marked > 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {DEFECTOS_ANEXO3.map(def => {
          const state = defectos.find(d => d.id === def.id)!;
          return (
            <div
              key={def.id}
              style={{
                border: `1px solid ${state.marcado ? 'var(--color-rojo)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                transition: 'border-color var(--transition-interactive)',
              }}
            >
              <div
                className="checkbox-row"
                style={{
                  background: state.marcado ? 'var(--color-rojo-bg)' : undefined,
                  borderRadius: 0,
                  border: 'none',
                }}
              >
                <input
                  type="checkbox"
                  id={`defecto-${def.id}`}
                  checked={state.marcado}
                  onChange={() => toggleDefecto(def.id)}
                />
                <label
                  htmlFor={`defecto-${def.id}`}
                  style={{
                    fontSize: 'var(--text-sm)',
                    cursor: 'pointer',
                    flex: 1,
                    color: state.marcado ? 'var(--color-rojo)' : 'var(--color-text)',
                    fontWeight: state.marcado ? 600 : 400,
                  }}
                >
                  {def.label}
                </label>
                {state.marcado && (
                  <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                )}
              </div>

              {state.marcado && (
                <div
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--color-rojo-bg)',
                    borderTop: '1px solid oklch(60% 0.2 15 / 0.2)',
                  }}
                >
                  <input
                    className="input-field"
                    placeholder="Describa la instalación afectada y sus componentes..."
                    value={state.instalacion_afectada}
                    onChange={e => updateText(def.id, e.target.value)}
                    style={{
                      background: 'var(--color-surface)',
                      fontSize: 'var(--text-sm)',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
