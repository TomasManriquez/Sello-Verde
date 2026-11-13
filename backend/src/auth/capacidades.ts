import { SetMetadata } from '@nestjs/common';

export type Capacidad = 'read' | 'write' | 'delete';

// Misma matriz que Gestión de Establecimientos (ROLE_CAPABILITIES): un rol desconocido no puede nada.
const CAPACIDADES_POR_ROL: Record<string, Capacidad[]> = {
  admin: ['read', 'write', 'delete'],
  editor: ['read', 'write'],
  viewer: ['read'],
};

export function puede(rol: string | undefined, capacidad: Capacidad): boolean {
  return CAPACIDADES_POR_ROL[rol]?.includes(capacidad) ?? false;
}

/** Capacidad que exige un endpoint según su método HTTP, salvo que declare otra con @Capacidad. */
export function capacidadDeMetodo(metodo: string): Capacidad {
  if (['GET', 'HEAD', 'OPTIONS'].includes(metodo)) return 'read';
  return metodo === 'DELETE' ? 'delete' : 'write';
}

export const CAPACIDAD_KEY = 'capacidad';

/** Para un POST que solo lee (por ejemplo, exportar a Excel). */
export const Capacidad = (capacidad: Capacidad) => SetMetadata(CAPACIDAD_KEY, capacidad);
