import type { Local } from '../establecimientos/entities/local.entity';
import type { Certificacion } from '../certificaciones/entities/certificacion.entity';
import { EstadoGeneral, EstadoTC6, TipoSello } from './enums';

/**
 * Cálculo del estado de sello por instalación y del estado general derivado.
 *
 * Regla de negocio: la unidad certificable es la INSTALACIÓN. El estado de un
 * establecimiento no es "el último sello registrado" sino el resultado de
 * todas sus instalaciones con gas (el peor manda). Se calcula al leer, sin
 * depender de un campo copiado a mano.
 */

/** Vigencia del Sello Verde (2 años). */
export const VIGENCIA_VERDE_DIAS = 730;
/** Plazo normativo de regularización para sello amarillo/rojo. */
export const PLAZO_REGULARIZACION_DIAS = 90;

export type EstadoSello =
  | 'sin_inspeccion'
  | 'verde'
  | 'verde_vencido'
  | 'amarillo'
  | 'rojo';

export interface SelloInstalacion {
  instalacion_id: number;
  local_id: number;
  numero_local: number;
  estado_sello: EstadoSello;
  /** Sello de la última inspección aplicable (null si nunca se inspeccionó) */
  tipo_sello: TipoSello | null;
  certificacion_id: number | null;
  fecha_inspeccion: string | null;
  /** Verde: vencimiento a 2 años. Amarillo/rojo: fin del plazo de 90 días. */
  fecha_limite: string | null;
  dias_restantes: number | null;
  /** Amarillo/rojo con el plazo de regularización ya cumplido */
  plazo_vencido: boolean;
}

export interface ResumenSellos {
  total_instalaciones: number;
  verdes: number;
  amarillos: number;
  rojos: number;
  vencidos: number;
  sin_inspeccion: number;
  /** Fecha límite más cercana entre las instalaciones inspeccionadas (puede estar vencida) */
  proximo_vencimiento: string | null;
}

// ── Fechas ───────────────────────────────────────────────────

/** Acepta 'YYYY-MM-DD' (columna `date` de Postgres) o Date. Devuelve medianoche local. */
function aFecha(valor: Date | string | null | undefined): Date | null {
  if (!valor) return null;
  if (typeof valor === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(valor);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function aIso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function sumarDias(d: Date, dias: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + dias);
  return r;
}

const MS_DIA = 24 * 60 * 60 * 1000;

// ── Selección de la inspección vigente ───────────────────────

function esMasReciente(a: Certificacion, b: Certificacion): boolean {
  const fa = aFecha(a.fecha_inspeccion)?.getTime() ?? 0;
  const fb = aFecha(b.fecha_inspeccion)?.getTime() ?? 0;
  if (fa !== fb) return fa > fb;
  return a.id > b.id;
}

/**
 * Una certificación aplica a una instalación si la nombra explícitamente.
 * Compatibilidad con datos antiguos: una certificación solo con local aplica a
 * las instalaciones de ese local, y una sin local ni instalación aplica a todas.
 */
function certificacionAplica(cert: Certificacion, localId: number, instalacionId: number): boolean {
  if (!cert.tipo_sello || !cert.fecha_inspeccion) return false;
  if (cert.instalacion_id) return cert.instalacion_id === instalacionId;
  if (cert.local_id) return cert.local_id === localId;
  return true;
}

// ── Sellos por instalación ───────────────────────────────────

export function calcularSellos(
  locales: Local[] | undefined,
  certificaciones: Certificacion[] | undefined,
  hoy: Date = new Date(),
): SelloInstalacion[] {
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const certs = certificaciones ?? [];
  const sellos: SelloInstalacion[] = [];

  for (const local of locales ?? []) {
    if (local.usa_gas === false) continue; // sin gas: nada que certificar
    for (const inst of local.instalaciones ?? []) {
      let vigente: Certificacion | null = null;
      for (const c of certs) {
        if (!certificacionAplica(c, local.id, inst.id)) continue;
        if (!vigente || esMasReciente(c, vigente)) vigente = c;
      }

      const base = {
        instalacion_id: inst.id,
        local_id: local.id,
        numero_local: local.numero_local,
      };

      if (!vigente) {
        sellos.push({
          ...base,
          estado_sello: 'sin_inspeccion',
          tipo_sello: null,
          certificacion_id: null,
          fecha_inspeccion: null,
          fecha_limite: null,
          dias_restantes: null,
          plazo_vencido: false,
        });
        continue;
      }

      const inspeccion = aFecha(vigente.fecha_inspeccion)!;
      const esVerde = vigente.tipo_sello === TipoSello.VERDE;
      const limite = sumarDias(inspeccion, esVerde ? VIGENCIA_VERDE_DIAS : PLAZO_REGULARIZACION_DIAS);
      const dias = Math.ceil((limite.getTime() - inicioHoy.getTime()) / MS_DIA);

      let estado: EstadoSello;
      if (esVerde) estado = dias < 0 ? 'verde_vencido' : 'verde';
      else estado = vigente.tipo_sello === TipoSello.ROJO ? 'rojo' : 'amarillo';

      sellos.push({
        ...base,
        estado_sello: estado,
        tipo_sello: vigente.tipo_sello,
        certificacion_id: vigente.id,
        fecha_inspeccion: aIso(inspeccion),
        fecha_limite: aIso(limite),
        dias_restantes: dias,
        plazo_vencido: !esVerde && dias < 0,
      });
    }
  }
  return sellos;
}

export function resumirSellos(sellos: SelloInstalacion[]): ResumenSellos {
  const inspeccionadas = sellos.filter((s) => s.estado_sello !== 'sin_inspeccion');
  const limites = inspeccionadas.map((s) => s.fecha_limite!).sort();
  return {
    total_instalaciones: sellos.length,
    verdes: sellos.filter((s) => s.estado_sello === 'verde').length,
    amarillos: sellos.filter((s) => s.estado_sello === 'amarillo').length,
    rojos: sellos.filter((s) => s.estado_sello === 'rojo').length,
    vencidos: sellos.filter((s) => s.estado_sello === 'verde_vencido' || s.plazo_vencido).length,
    sin_inspeccion: sellos.length - inspeccionadas.length,
    proximo_vencimiento: limites[0] ?? null,
  };
}

// ── Estado general derivado ──────────────────────────────────

/** Hay un local que usa gas pero aún no tiene ninguna instalación registrada (Anexo 2 incompleto). */
export function levantamientoIncompleto(locales: Local[] | undefined): boolean {
  return (locales ?? []).some((l) => l.usa_gas !== false && (l.instalaciones?.length ?? 0) === 0);
}

const SELLO_A_ESTADO: Record<string, EstadoGeneral> = {
  [TipoSello.VERDE]: EstadoGeneral.SELLO_VERDE,
  [TipoSello.AMARILLO]: EstadoGeneral.SELLO_AMARILLO,
  [TipoSello.ROJO]: EstadoGeneral.SELLO_ROJO,
};

/**
 * Estado del establecimiento:
 *  - sin expediente → sin_gestion
 *  - alguna instalación en rojo → sello_rojo; si no, en amarillo → sello_amarillo
 *  - todas verdes y vigentes → sello_verde (solo si el levantamiento está completo)
 *  - inspeccionado pero con instalaciones pendientes, verde vencido o levantamiento incompleto
 *    → en_regularizacion
 *  - sin inspecciones: según TC6 (aprobado → en_regularizacion, en trámite → en_proyecto,
 *    sin iniciar → en_levantamiento)
 */
export function derivarEstadoGeneral(params: {
  expediente?: { estado_tc6: EstadoTC6 } | null;
  sellos: SelloInstalacion[];
  certificaciones?: Certificacion[];
  /** Si se entrega, un local con gas sin instalaciones registradas impide el Sello Verde */
  locales?: Local[];
}): EstadoGeneral {
  const { expediente, sellos, certificaciones = [], locales } = params;
  if (!expediente) return EstadoGeneral.SIN_GESTION;

  const inspeccionadas = sellos.filter((s) => s.estado_sello !== 'sin_inspeccion');
  if (inspeccionadas.length > 0) {
    if (sellos.some((s) => s.estado_sello === 'rojo')) return EstadoGeneral.SELLO_ROJO;
    if (sellos.some((s) => s.estado_sello === 'amarillo')) return EstadoGeneral.SELLO_AMARILLO;
    if (sellos.every((s) => s.estado_sello === 'verde') && !levantamientoIncompleto(locales)) {
      return EstadoGeneral.SELLO_VERDE;
    }
    return EstadoGeneral.EN_REGULARIZACION;
  }

  // Datos antiguos: certificaciones sin instalaciones registradas → manda la última
  if (sellos.length === 0) {
    const validas = certificaciones.filter((c) => c.tipo_sello && c.fecha_inspeccion);
    if (validas.length > 0) {
      const ultima = validas.reduce((a, b) => (esMasReciente(a, b) ? a : b));
      return SELLO_A_ESTADO[ultima.tipo_sello];
    }
  }

  if (expediente.estado_tc6 === EstadoTC6.TC6_APROBADO) return EstadoGeneral.EN_REGULARIZACION;
  if (expediente.estado_tc6 !== EstadoTC6.SIN_INICIAR) return EstadoGeneral.EN_PROYECTO;
  return EstadoGeneral.EN_LEVANTAMIENTO;
}

/** El expediente vigente de un establecimiento es el de mayor id (misma regla que el resto del sistema). */
export function expedienteActivo<T extends { id: number }>(expedientes: T[] | undefined): T | undefined {
  if (!expedientes || expedientes.length === 0) return undefined;
  return [...expedientes].sort((a, b) => b.id - a.id)[0];
}
