'use client';

import React from 'react';
import Link from 'next/link';
import { Alerta } from '@/lib/api';
import { getUrgencyClass, formatDate } from '@/lib/constants';

interface AlertChipProps {
  alerta: Alerta;
}

export function AlertChip({ alerta }: AlertChipProps) {
  const urgencyClass = getUrgencyClass(alerta.dias_restantes);

  return (
    <Link
      href={`/expedientes/${alerta.expediente_id}`}
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
        {alerta.dias_restantes < 0
          ? `Vencida hace ${Math.abs(alerta.dias_restantes)}d`
          : `${alerta.dias_restantes}d`}
      </span>
      <span style={{ opacity: 0.6, fontSize: '10px' }}>
        {formatDate(alerta.fecha_vencimiento)}
      </span>
    </Link>
  );
}
