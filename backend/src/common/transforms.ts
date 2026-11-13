/**
 * Transformaciones para DTOs: texto sin espacios sobrantes.
 * `textoOpcional`: un texto vacío equivale a "no enviado" (se usa al crear).
 * `textoOVacio`: un texto vacío equivale a "borrar el valor" (se usa al editar: null limpia la columna).
 */
export const textoOpcional = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export const textoOVacio = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;
