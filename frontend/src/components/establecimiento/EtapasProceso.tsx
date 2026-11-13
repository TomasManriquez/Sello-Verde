'use client';

import React from 'react';
import { ETAPAS_PROCESO, etapaActual, ProximoPaso } from '@/lib/proximoPaso';
import { formatDate } from '@/lib/constants';

/** Recorrido del establecimiento por las etapas del proceso, siempre visible en la ficha. */
export function EtapasProceso({ estadoGeneral }: { estadoGeneral: string }) {
  const actual = etapaActual(estadoGeneral);
  const tono =
    estadoGeneral === 'sello_rojo' ? 'tono-rojo' : estadoGeneral === 'sello_amarillo' ? 'tono-amarillo' : '';

  return (
    <ol className="etapas" aria-label="Etapas del proceso">
      {ETAPAS_PROCESO.map((nombre, i) => {
        const estado = i < actual ? 'hecha' : i === actual ? 'actual' : '';
        return (
          <li key={nombre} className={`etapa ${estado} ${estado === 'actual' ? tono : ''}`} aria-current={estado === 'actual' ? 'step' : undefined}>
            <span className="etapa-barra" />
            <span className="etapa-nombre">{i + 1} · {nombre}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Qué hacer ahora con el establecimiento: siguiente paso, plazo y la única acción primaria de la ficha
 * (se recibe como `children`, porque quién puede ejecutarla lo decide la página).
 */
export function BannerProximoPaso({ paso, children }: { paso: ProximoPaso; children?: React.ReactNode }) {
  const { plazo } = paso;
  const vencido = !!plazo && plazo.dias < 0;
  const transcurrido = plazo ? Math.min(plazo.total, Math.max(0, plazo.total - plazo.dias)) : 0;
  const tonoPlazo = !plazo ? '' : plazo.dias <= 7 ? 'rojo' : plazo.dias <= 30 ? 'amarillo' : 'verde';

  return (
    <section className={`banner-paso ${paso.tono}`} role="status" aria-label="Siguiente paso">
      <div className="banner-paso-texto">
        <span className="banner-paso-etiqueta">Siguiente paso</span>
        <strong className="banner-paso-titulo">{paso.titulo}</strong>
        {paso.detalle && <span className="banner-paso-detalle">{paso.detalle}</span>}
        {children && <div style={{ marginTop: 'var(--space-2)' }}>{children}</div>}
      </div>

      {plazo && (
        <div className="banner-plazo">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
            <span className={`banner-plazo-dias ${tonoPlazo}`}>{Math.abs(plazo.dias)}</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
              {vencido ? 'días vencido' : plazo.dias === 1 ? 'día restante' : 'días restantes'}
            </span>
          </div>
          <div
            className="banner-plazo-barra"
            role="img"
            aria-label={`Han pasado ${transcurrido} de ${plazo.total} días del plazo`}
          >
            <div className={tonoPlazo} style={{ width: `${vencido ? 100 : (transcurrido / plazo.total) * 100}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            <span>{plazo.inicio ? `Inspección ${formatDate(plazo.inicio)}` : ''}</span>
            <strong style={{ color: 'var(--color-text)' }}>{plazo.fin ? `Vence ${formatDate(plazo.fin)}` : ''}</strong>
          </div>
        </div>
      )}
    </section>
  );
}
