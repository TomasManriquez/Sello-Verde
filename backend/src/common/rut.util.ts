/**
 * Utilidades de RUT chileno. Formato de almacenamiento: "12.345.678-9" (con puntos y guion,
 * dígito verificador en mayúscula), igual al de los datos existentes.
 */

/** Deja solo dígitos y K, en mayúscula. */
export function limpiarRut(valor: string): string {
  return String(valor ?? '').replace(/[^0-9kK]/g, '').toUpperCase();
}

/** Cuerpo de 7 u 8 dígitos más dígito verificador (dígito o K). */
export function tieneFormatoRut(valor: string): boolean {
  return /^\d{7,8}[\dK]$/.test(limpiarRut(valor));
}

/** Da formato "12.345.678-9". Devuelve el texto limpio si aún es demasiado corto. */
export function formatearRut(valor: string): string {
  const limpio = limpiarRut(valor);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
}

/** Dígito verificador esperado (módulo 11) para un cuerpo numérico. */
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

/** ¿El dígito verificador coincide? Solo tiene sentido si el formato es válido. */
export function dvCorrecto(valor: string): boolean {
  const limpio = limpiarRut(valor);
  return dvEsperado(limpio.slice(0, -1)) === limpio.slice(-1);
}
