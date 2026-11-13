import { getToken } from './api';

export type Capacidad = 'read' | 'write' | 'delete';

// Misma matriz que el backend (auth/capacidades.ts).
const POR_ROL: Record<string, Capacidad[]> = {
  admin: ['read', 'write', 'delete'],
  editor: ['read', 'write'],
  viewer: ['read'],
};

/**
 * Solo decide qué botones se muestran: quien impide la acción es el backend.
 * El rol es el del último inicio de sesión; las pantallas protegidas solo se dibujan con sesión abierta.
 */
export function puede(capacidad: Capacidad): boolean {
  try {
    const rol = JSON.parse(atob(getToken()!.split('.')[1])).rol;
    return POR_ROL[rol]?.includes(capacidad) ?? false;
  } catch {
    return false;
  }
}
