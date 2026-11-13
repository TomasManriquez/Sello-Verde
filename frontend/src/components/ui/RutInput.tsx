'use client';

import React, { useState } from 'react';
import { Input } from './Input';
import { estadoRut, formatearRut } from '@/lib/rut';

interface RutInputProps {
  label?: string;
  value: string;
  onValueChange: (valor: string) => void;
  required?: boolean;
  placeholder?: string;
  id?: string;
}

/**
 * Campo de RUT: agrega puntos y guion mientras se escribe ("123456789" → "12.345.678-9").
 * Formato inválido bloquea (error al salir del campo); dígito verificador inconsistente solo advierte.
 */
export function RutInput({ label = 'RUT', value, onValueChange, required, placeholder = '12.345.678-9', id }: RutInputProps) {
  const [tocado, setTocado] = useState(false);
  const estado = estadoRut(value);

  const error = tocado && estado === 'incompleto'
    ? 'Formato inválido: usa 7 u 8 dígitos y el verificador (ej: 12.345.678-9).'
    : undefined;
  const aviso = estado === 'dv_incorrecto'
    ? '⚠ El dígito verificador no coincide con el RUT ingresado. Revísalo.'
    : undefined;

  return (
    <Input
      id={id}
      label={label}
      value={value}
      onChange={(e) => onValueChange(formatearRut(e.target.value))}
      onBlur={() => setTocado(true)}
      placeholder={placeholder}
      required={required}
      inputMode="text"
      autoComplete="off"
      maxLength={12}
      error={error}
      helpText={aviso}
    />
  );
}
