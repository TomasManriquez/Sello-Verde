import type { Establecimiento, Local, Instalacion, SelloInstalacion } from './api';
import { formatDate, instalacionLabel } from './constants';

/** Con cuántos días de anticipación se pide reinspeccionar un sello verde (reinspeccionar exige licitar). */
export const AVISO_REINSPECCION_DIAS = 120;

/** Espejo de PLAZO_REGULARIZACION_DIAS / VIGENCIA_VERDE_DIAS del backend (sellos.util.ts). */
const PLAZO_REGULARIZACION_DIAS = 90;
const VIGENCIA_VERDE_DIAS = 730;

export interface Plazo {
  dias: number;
  /** Duración total del plazo, para la barra de avance */
  total: number;
  inicio: string | null;
  fin: string | null;
}

export type AccionKind =
  | 'iniciar_gestion'
  | 'agregar_local'
  | 'agregar_instalacion'
  | 'avanzar_tc6'
  | 'inspeccion';

export interface ProximoPaso {
  tono: 'urgente' | 'atencion' | 'info' | 'ok';
  titulo: string;
  detalle?: string;
  /** Plazo de la instalación más urgente (regularización o vencimiento del verde) */
  plazo?: Plazo;
  /** Se muestra como la acción primaria de la ficha */
  accion?: Accion;
  /** Segunda respuesta posible al mismo paso (botón secundario) */
  alternativa?: Accion;
}

interface Accion {
  kind: AccionKind;
  label: string;
  instalacionId?: number;
  localId?: number;
  /** Solo para `avanzar_tc6` */
  estadoTc6?: string;
}

interface Entrada {
  local: Local;
  inst: Instalacion;
  sello: SelloInstalacion;
}

const TC6_SIGUIENTE: Record<string, { estado: string; label: string } | undefined> = {
  sin_iniciar: { estado: 'en_elaboracion', label: 'Iniciar elaboración del TC6' },
  en_elaboracion: { estado: 'ingresado_sec', label: 'Marcar TC6 ingresado a la SEC' },
  ingresado_sec: { estado: 'tc6_aprobado', label: 'Marcar TC6 aprobado' },
  observado: { estado: 'tc6_aprobado', label: 'Marcar TC6 aprobado' },
};

function plural(n: number, uno: string, varios: string) {
  return n === 1 ? uno : varios;
}

/** Qué debería hacer el encargado ahora con este establecimiento (la tarea más urgente). */
export function calcularProximoPaso(ee: Establecimiento): ProximoPaso {
  const exp = ee.expediente_activo;
  const locales = ee.locales ?? [];

  if (!exp) {
    return {
      tono: 'info',
      titulo: 'Aún no se inicia la gestión de este establecimiento',
      detalle: 'Registra la empresa contratista de la licitación para abrir el proceso.',
      accion: { kind: 'iniciar_gestion', label: 'Iniciar gestión' },
    };
  }

  if (locales.length === 0) {
    return {
      tono: 'info',
      titulo: 'Falta el levantamiento (Anexo 2)',
      detalle: 'Registra los locales del establecimiento y las instalaciones de gas de cada uno.',
      accion: { kind: 'agregar_local', label: 'Agregar local' },
    };
  }

  const conGas = locales.filter((l) => l.usa_gas);
  if (conGas.length === 0) {
    return {
      tono: 'ok',
      titulo: 'Ningún local usa gas',
      detalle: 'No hay instalaciones que certificar.',
    };
  }

  const entradas: Entrada[] = conGas.flatMap((local) =>
    (local.instalaciones ?? [])
      .filter((inst) => inst.sello)
      .map((inst) => ({ local, inst, sello: inst.sello as SelloInstalacion })),
  );
  const nombre = (e: Entrada) => instalacionLabel({ ...e.inst, local: e.local }) || `Instalación #${e.inst.id}`;
  const dias = (e: Entrada) => e.sello.dias_restantes ?? 0;

  // 1) Amarillo / rojo: regularizar dentro del plazo de 90 días
  const incumplidas = entradas
    .filter((e) => e.sello.estado_sello === 'rojo' || e.sello.estado_sello === 'amarillo')
    .sort(
      (a, b) =>
        Number(b.sello.plazo_vencido) - Number(a.sello.plazo_vencido) ||
        Number(b.sello.estado_sello === 'rojo') - Number(a.sello.estado_sello === 'rojo') ||
        dias(a) - dias(b),
    );
  if (incumplidas.length > 0) {
    const e = incumplidas[0];
    const color = e.sello.estado_sello === 'rojo' ? 'rojo' : 'amarillo';
    const resto = incumplidas.length - 1;
    return {
      tono: 'urgente',
      titulo: `Sello ${color} en ${nombre(e)}${resto > 0 ? ` (y ${resto} ${plural(resto, 'instalación más', 'instalaciones más')})` : ''}`,
      detalle: e.sello.plazo_vencido
        ? `El plazo de regularización venció hace ${Math.abs(dias(e))} días. Regulariza y registra una nueva inspección.`
        : `Regulariza y registra una nueva inspección antes del ${formatDate(e.sello.fecha_limite)} (${dias(e)} días).`,
      plazo: { dias: dias(e), total: PLAZO_REGULARIZACION_DIAS, inicio: e.sello.fecha_inspeccion, fin: e.sello.fecha_limite },
      accion: { kind: 'inspeccion', label: 'Registrar nueva inspección', instalacionId: e.inst.id },
    };
  }

  // 2) Sello verde vencido o por vencer: reinspeccionar con anticipación
  const porVencer = entradas
    .filter((e) => e.sello.estado_sello === 'verde_vencido' || (e.sello.estado_sello === 'verde' && dias(e) <= AVISO_REINSPECCION_DIAS))
    .sort((a, b) => dias(a) - dias(b));
  if (porVencer.length > 0) {
    const e = porVencer[0];
    const vencido = e.sello.estado_sello === 'verde_vencido';
    return {
      tono: vencido || dias(e) <= 30 ? 'urgente' : 'atencion',
      titulo: vencido ? `Sello verde vencido en ${nombre(e)}` : `Sello verde por vencer en ${nombre(e)}`,
      detalle: vencido
        ? `Venció hace ${Math.abs(dias(e))} días. Programa la reinspección.`
        : `Vence el ${formatDate(e.sello.fecha_limite)} (${dias(e)} días). Programa la reinspección con anticipación.`,
      plazo: { dias: dias(e), total: VIGENCIA_VERDE_DIAS, inicio: e.sello.fecha_inspeccion, fin: e.sello.fecha_limite },
      accion: { kind: 'inspeccion', label: 'Registrar nueva inspección', instalacionId: e.inst.id },
    };
  }

  // 3) Locales con gas sin instalaciones registradas (después de lo urgente)
  const sinInstalaciones = conGas.find((l) => !(l.instalaciones?.length));
  if (sinInstalaciones) {
    return {
      tono: 'info',
      titulo: `Falta registrar las instalaciones del Local ${sinInstalaciones.numero_local}`,
      detalle: 'Cada instalación de gas se inspecciona y recibe su propio sello.',
      accion: { kind: 'agregar_instalacion', label: 'Agregar instalación', localId: sinInstalaciones.id },
    };
  }

  // 4) Instalaciones sin ninguna inspección
  const sinInspeccion = entradas.filter((e) => e.sello.estado_sello === 'sin_inspeccion');
  if (sinInspeccion.length > 0) {
    const hayInspecciones = sinInspeccion.length < entradas.length;
    const tc6 = exp.estado_tc6;

    // Sin ninguna inspección todavía: el trabajo pendiente es el proyecto TC6
    if (!hayInspecciones && tc6 !== 'tc6_aprobado') {
      const sig = TC6_SIGUIENTE[tc6];
      const detalle: Record<string, string> = {
        sin_iniciar: 'El levantamiento está registrado. Sigue con el proyecto de diseño TC6.',
        en_elaboracion: 'Cuando el proyecto se ingrese a la SEC, márcalo en la ficha.',
        ingresado_sec: 'Registra la respuesta de la SEC: observado o aprobado.',
        observado: 'Corrige las observaciones y registra la aprobación cuando la SEC responda.',
      };
      return {
        tono: 'info',
        titulo: `Proyecto TC6: ${tc6.replace(/_/g, ' ')}`,
        detalle: detalle[tc6],
        accion: sig ? { kind: 'avanzar_tc6', label: sig.label, estadoTc6: sig.estado } : undefined,
        // Con el proyecto ingresado la SEC puede responder de dos formas
        alternativa: tc6 === 'ingresado_sec' ? { kind: 'avanzar_tc6', label: 'Observado por la SEC', estadoTc6: 'observado' } : undefined,
      };
    }

    const e = sinInspeccion[0];
    return {
      tono: 'info',
      titulo:
        sinInspeccion.length === 1
          ? `Falta inspeccionar ${nombre(e)}`
          : `Faltan ${sinInspeccion.length} instalaciones por inspeccionar`,
      detalle: hayInspecciones
        ? 'El establecimiento tendrá Sello Verde cuando todas sus instalaciones estén aprobadas.'
        : 'TC6 aprobado: coordina las obras y registra la inspección de cada instalación.',
      accion: { kind: 'inspeccion', label: 'Registrar inspección', instalacionId: e.inst.id },
    };
  }

  const prox = ee.resumen_sellos?.proximo_vencimiento;
  return {
    tono: 'ok',
    titulo: 'Todo al día',
    detalle: prox ? `Todas las instalaciones tienen Sello Verde. Próximo vencimiento: ${formatDate(prox)}.` : undefined,
  };
}

/** Posición en las etapas del proceso (−1 = aún sin gestión). */
export const ETAPAS_PROCESO = ['Levantamiento', 'Proyecto TC6', 'Obras / Regularización', 'Inspección', 'Sello vigente'] as const;

export function etapaActual(estadoGeneral: string): number {
  switch (estadoGeneral) {
    case 'en_levantamiento': return 0;
    case 'en_proyecto': return 1;
    case 'en_regularizacion':
    case 'en_certificacion': return 2;
    case 'sello_rojo':
    case 'sello_amarillo': return 3;
    case 'sello_verde': return 5; // todas completadas
    default: return -1;
  }
}
