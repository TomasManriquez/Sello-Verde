'use client';

import React from 'react';
import Link from 'next/link';
import { Alerta } from '@/lib/api';
import { getUrgencyClass, formatDate, diasRestantesAlerta, fichaHref } from '@/lib/constants';

interface AlertChipProps {
  alerta: Alerta;
}

export function AlertChip({ alerta }: AlertChipProps) {
  const dias = diasRestantesAlerta(alerta);
  const urgencyClass = getUrgencyClass(dias);

  return (
    <Link
      href={fichaHref(alerta)}
      className={`alert-chip ${urgencyClass}`}
      title={`${alerta.expediente?.establecimiento?.nombre ?? 'Expediente'} — ${alerta.tipo}`}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'currentColor',
          flexShrink: 0,
        }}
      />
      <span style={{ fontWeight: 600 }}>
        {alerta.expediente?.establecimiento?.nombre ?? `Exp. #${alerta.expediente_id}`}
      </span>
      <span style={{ opacity: 0.8 }}>
        {dias < 0 ? `Vencida hace ${Math.abs(dias)}d` : `${dias}d`}
      </span>
      <span style={{ opacity: 0.6, fontSize: '10px' }}>
        {formatDate(alerta.fecha_vencimiento)}
      </span>
    </Link>
  );
}
