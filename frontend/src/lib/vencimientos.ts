import { UrgenciaVencimiento, Vencimiento } from '@/lib/api';
import { formatDate, instalacionLabel } from '@/lib/constants';

/** Orden en que se agrupan: lo más urgente primero. */
export const URGENCIAS: UrgenciaVencimiento[] = ['fuera_de_plazo', 'proximo_30d', 'proximo_90d', 'al_dia'];

export const URGENCIA_TITULO: Record<UrgenciaVencimiento, string> = {
  fuera_de_plazo: 'Fuera de plazo',
  proximo_30d: 'Próximos 30 días',
  proximo_90d: 'Próximos 90 días',
  al_dia: 'Al día',
};

/** El color se reserva para lo que ya falló o está por hacerlo; el resto va en tono neutro. */
export const URGENCIA_COLOR: Record<UrgenciaVencimiento, string> = {
  fuera_de_plazo: 'var(--color-rojo)',
  proximo_30d: 'var(--color-amarillo)',
  proximo_90d: 'var(--color-text-muted)',
  al_dia: 'var(--color-verde)',
};

/** "Local 1 · Casino · Cilindros 45 kg" */
export function dondeVencimiento(v: Vencimiento): string {
  return instalacionLabel({
    local: { numero_local: v.numero_local },
    zona_abastecimiento: v.zona_abastecimiento,
    referencia: v.referencia,
    abastecimiento: v.abastecimiento,
  });
}

/** Qué ocurre con la instalación y cuándo, en una línea. */
export function motivoTexto(v: Vencimiento): string {
  const fecha = formatDate(v.fecha_limite);
  const sello = v.tipo_sello === 'rojo' ? 'Sello rojo' : 'Sello amarillo';
  switch (v.motivo) {
    case 'verde_vigente':
      return `Sello verde vigente hasta el ${fecha}`;
    case 'verde_por_vencer':
      return `Sello verde · vence el ${fecha}`;
    case 'verde_vencido':
      return `Sello verde vencido el ${fecha}`;
    case 'regularizacion':
      return `${sello} · plazo de regularización hasta el ${fecha}`;
    case 'plazo_vencido':
      return `${sello} · el plazo de regularización venció el ${fecha}`;
  }
}

export const fichaHref = (v: Vencimiento) => `/establecimientos/${v.establecimiento_id}`;

export const inspeccionHref = (v: Vencimiento) =>
  `/expedientes/${v.expediente_id}/certificacion?instalacion=${v.instalacion_id}`;

/** Fuera de plazo y próximos 30 días piden registrar una inspección; el resto solo se consulta. */
export const pideInspeccion = (v: Vencimiento) =>
  v.urgencia === 'fuera_de_plazo' || v.urgencia === 'proximo_30d';
