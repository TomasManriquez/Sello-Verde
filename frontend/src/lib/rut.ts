/**
 * Utilidades de RUT chileno (espejo de backend/src/common/rut.util.ts).
 * Formato de almacenamiento y de pantalla: "12.345.678-9".
 */

/** Deja solo dígitos y K, en mayúscula, con un máximo de 9 caracteres (8 de cuerpo + verificador). */
export function limpiarRut(valor: string): string {
  return String(valor ?? '').replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
}

/** Da formato mientras se escribe: "1" → "1", "12" → "1-2", "123456789" → "12.345.678-9". */
export function formatearRut(valor: string): string {
  const limpio = limpiarRut(valor);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
}

/** Cuerpo de 7 u 8 dígitos más dígito verificador (dígito o K). */
export function rutFormatoValido(valor: string): boolean {
  return /^\d{7,8}[\dK]$/.test(limpiarRut(valor));
}

/** Dígito verificador esperado (módulo 11). */
export function dvEsperado(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  return resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
}

export function rutDvCorrecto(valor: string): boolean {
  const limpio = limpiarRut(valor);
  return dvEsperado(limpio.slice(0, -1)) === limpio.slice(-1);
}

export type EstadoRut = 'vacio' | 'incompleto' | 'dv_incorrecto' | 'ok';

export function estadoRut(valor: string): EstadoRut {
  if (!limpiarRut(valor)) return 'vacio';
  if (!rutFormatoValido(valor)) return 'incompleto';
  return rutDvCorrecto(valor) ? 'ok' : 'dv_incorrecto';
}
