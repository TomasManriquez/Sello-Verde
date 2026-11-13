import type { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { calcularSellos, expedienteActivo, SelloInstalacion } from './sellos.util';

/**
 * Vencimientos derivados: lo que el encargado debe atender, calculado al leer
 * desde el sello vigente de cada instalación. No hay estados que mantener a mano:
 * un vencimiento se cierra solo cuando se registra una nueva inspección.
 */

/** Días de anticipación con que un Sello Verde empieza a mostrarse como "por vencer". */
export const AVISO_VERDE_DIAS = 90;
const URGENTE_DIAS = 30;

export type UrgenciaVencimiento = 'fuera_de_plazo' | 'proximo_30d' | 'proximo_90d' | 'al_dia';

export type MotivoVencimiento =
  | 'verde_vigente'
  | 'verde_por_vencer'
  | 'verde_vencido'
  | 'regularizacion'
  | 'plazo_vencido';

export interface Vencimiento {
  instalacion_id: number;
  local_id: number;
  numero_local: number;
  zona_abastecimiento: string | null;
  referencia: string | null;
  abastecimiento: string | null;
  establecimiento_id: number;
  establecimiento_nombre: string;
  expediente_id: number;
  tipo_sello: SelloInstalacion['tipo_sello'];
  estado_sello: SelloInstalacion['estado_sello'];
  fecha_inspeccion: string | null;
  /** Verde: vencimiento a 2 años. Amarillo/rojo: fin del plazo de 90 días. */
  fecha_limite: string;
  /** Negativo cuando ya venció */
  dias_restantes: number;
  urgencia: UrgenciaVencimiento;
  motivo: MotivoVencimiento;
}

export interface ResumenVencimientos {
  fuera_de_plazo: number;
  proximos_30d: number;
  proximos_90d: number;
  al_dia: number;
  /** Fuera de plazo + próximos 30 días: lo que se muestra como "requiere acción" */
  requieren_accion: number;
}

/** Clasifica el sello de una instalación. `null` = no hay plazo corriendo (sin inspección). */
export function clasificarSello(
  sello: SelloInstalacion,
): { urgencia: UrgenciaVencimiento; motivo: MotivoVencimiento } | null {
  if (sello.estado_sello === 'sin_inspeccion' || sello.dias_restantes === null) return null;
  const dias = sello.dias_restantes;

  if (sello.estado_sello === 'verde_vencido') {
    return { urgencia: 'fuera_de_plazo', motivo: 'verde_vencido' };
  }
  if (sello.estado_sello === 'verde') {
    if (dias <= URGENTE_DIAS) return { urgencia: 'proximo_30d', motivo: 'verde_por_vencer' };
    if (dias <= AVISO_VERDE_DIAS) return { urgencia: 'proximo_90d', motivo: 'verde_por_vencer' };
    return { urgencia: 'al_dia', motivo: 'verde_vigente' };
  }
  // amarillo / rojo: corre el plazo de regularización
  if (sello.plazo_vencido) return { urgencia: 'fuera_de_plazo', motivo: 'plazo_vencido' };
  if (dias <= URGENTE_DIAS) return { urgencia: 'proximo_30d', motivo: 'regularizacion' };
  return { urgencia: 'proximo_90d', motivo: 'regularizacion' };
}

const PESO: Record<UrgenciaVencimiento, number> = {
  fuera_de_plazo: 0,
  proximo_30d: 1,
  proximo_90d: 2,
  al_dia: 3,
};

/** Un vencimiento por instalación inspeccionada, del más urgente al menos. */
export function calcularVencimientos(
  establecimientos: Establecimiento[],
  hoy: Date = new Date(),
): Vencimiento[] {
  const items: Vencimiento[] = [];

  for (const est of establecimientos) {
    const activo = expedienteActivo(est.expedientes);
    if (!activo) continue;

    const sellos = calcularSellos(est.locales, activo.certificaciones, hoy);
    for (const sello of sellos) {
      const clase = clasificarSello(sello);
      if (!clase) continue;
      const inst = est.locales
        ?.find((l) => l.id === sello.local_id)
        ?.instalaciones?.find((i) => i.id === sello.instalacion_id);

      items.push({
        instalacion_id: sello.instalacion_id,
        local_id: sello.local_id,
        numero_local: sello.numero_local,
        zona_abastecimiento: inst?.zona_abastecimiento ?? null,
        referencia: inst?.referencia ?? null,
        abastecimiento: inst?.abastecimiento ?? null,
        establecimiento_id: est.id,
        establecimiento_nombre: est.nombre,
        expediente_id: activo.id,
        tipo_sello: sello.tipo_sello,
        estado_sello: sello.estado_sello,
        fecha_inspeccion: sello.fecha_inspeccion,
        fecha_limite: sello.fecha_limite!,
        dias_restantes: sello.dias_restantes!,
        urgencia: clase.urgencia,
        motivo: clase.motivo,
      });
    }
  }

  return items.sort(
    (a, b) =>
      PESO[a.urgencia] - PESO[b.urgencia] ||
      a.dias_restantes - b.dias_restantes ||
      a.establecimiento_nombre.localeCompare(b.establecimiento_nombre),
  );
}

export function resumirVencimientos(items: Vencimiento[]): ResumenVencimientos {
  const cuenta = (u: UrgenciaVencimiento) => items.filter((v) => v.urgencia === u).length;
  const fuera_de_plazo = cuenta('fuera_de_plazo');
  const proximos_30d = cuenta('proximo_30d');
  return {
    fuera_de_plazo,
    proximos_30d,
    proximos_90d: cuenta('proximo_90d'),
    al_dia: cuenta('al_dia'),
    requieren_accion: fuera_de_plazo + proximos_30d,
  };
}
