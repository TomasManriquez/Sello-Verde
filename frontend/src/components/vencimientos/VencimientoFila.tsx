'use client';

import React from 'react';
import Link from 'next/link';
import { Vencimiento } from '@/lib/api';
import {
  dondeVencimiento,
  fichaHref,
  inspeccionHref,
  motivoTexto,
  pideInspeccion,
  URGENCIA_COLOR,
} from '@/lib/vencimientos';

/**
 * Una instalación con un plazo corriendo. Una sola acción por fila: registrar la inspección
 * cuando el plazo es urgente, o abrir la ficha cuando solo hay que tenerlo presente.
 */
export function VencimientoFila({ v }: { v: Vencimiento }) {
  const fuera = v.urgencia === 'fuera_de_plazo';
  const dias = Math.abs(v.dias_restantes);
  const unidad = dias === 1 ? 'día' : 'días';
  const donde = dondeVencimiento(v);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        flexWrap: 'wrap',
        padding: 'var(--space-3) var(--space-4)',
      }}
    >
      <div style={{ minWidth: 76 }}>
        <div
          style={{
            fontFamily: 'Satoshi, sans-serif',
            fontWeight: 900,
            fontSize: 'var(--text-xl)',
            lineHeight: 1,
            color: fuera ? URGENCIA_COLOR.fuera_de_plazo : 'var(--color-text)',
          }}
        >
          {dias}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: fuera ? URGENCIA_COLOR.fuera_de_plazo : 'var(--color-text-muted)' }}>
          {fuera ? `${unidad} de atraso` : unidad}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 220 }}>
        <Link href={fichaHref(v)} style={{ fontWeight: 700, color: 'inherit', textDecoration: 'none' }}>
          {v.establecimiento_nombre}
        </Link>
        {donde && <div style={{ fontSize: 'var(--text-sm)' }}>{donde}</div>}
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{motivoTexto(v)}</div>
      </div>

      {pideInspeccion(v) ? (
        <Link href={inspeccionHref(v)} className="btn btn-secondary btn-sm">
          Registrar inspección
        </Link>
      ) : (
        <Link href={fichaHref(v)} className="btn btn-ghost btn-sm">
          Ver ficha
        </Link>
      )}
    </div>
  );
}
