'use client';

import React from 'react';
import { ETAPAS_PROCESO, etapaActual, ProximoPaso } from '@/lib/proximoPaso';

/** Recorrido del establecimiento por las etapas del proceso, siempre visible en la ficha. */
export function EtapasProceso({ estadoGeneral }: { estadoGeneral: string }) {
  const actual = etapaActual(estadoGeneral);
  const tono =
    estadoGeneral === 'sello_rojo' ? 'tono-rojo' : estadoGeneral === 'sello_amarillo' ? 'tono-amarillo' : '';

  return (
    <ol className="etapas" style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Etapas del proceso">
      {ETAPAS_PROCESO.map((nombre, i) => {
        const estado = i < actual ? 'hecha' : i === actual ? 'actual' : '';
        return (
          <li key={nombre} className={`etapa ${estado} ${estado === 'actual' ? tono : ''}`} aria-current={estado === 'actual' ? 'step' : undefined}>
            <span className="etapa-num">{estado === 'hecha' ? '✓' : i + 1}</span>
            {nombre}
          </li>
        );
      })}
    </ol>
  );
}

/** Qué hacer ahora con el establecimiento. Es informativo: la acción primaria vive en el encabezado. */
export function BannerProximoPaso({ paso }: { paso: ProximoPaso }) {
  return (
    <div className={`banner-paso ${paso.tono}`} role="status">
      <strong style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 'var(--text-sm)' }}>{paso.titulo}</strong>
      {paso.detalle && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{paso.detalle}</span>
      )}
    </div>
  );
}
