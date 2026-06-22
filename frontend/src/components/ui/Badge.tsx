'use client';

import React from 'react';
import { ESTADO_BADGE_CLASS, ESTADO_GENERAL } from '@/lib/constants';

interface BadgeProps {
  estado: string;
  className?: string;
}

const LABEL_MAP: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(ESTADO_GENERAL).map(([k, v]) => [k, v])
  ),
  verde:    'Verde',
  amarillo: 'Amarillo',
  rojo:     'Rojo',
  activa:   'Activa',
  notificada: 'Notificada',
  resuelta: 'Resuelta',
  sin_iniciar:    'Sin Iniciar',
  en_elaboracion: 'En Elaboración',
  ingresado_sec:  'Ingresado SEC',
  observado:      'Observado',
  tc6_aprobado:   'TC6 Aprobado',
};

export function Badge({ estado, className = '' }: BadgeProps) {
  const cssClass = ESTADO_BADGE_CLASS[estado] ?? 'badge-gris';
  const label    = LABEL_MAP[estado] ?? estado;

  return (
    <span className={`badge ${cssClass} ${className}`}>
      {label}
    </span>
  );
}
