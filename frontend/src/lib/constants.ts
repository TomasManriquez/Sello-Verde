// ── Constants — Sello Verde ──────────────────────────────────

/**
 * Root of the backend API (includes /api prefix).
 * Used for all REST calls.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

/**
 * Host origin of the backend (NO /api suffix).
 * Used to build absolute URLs for static files served from /uploads/...
 * In production: set NEXT_PUBLIC_API_URL=https://api.selloverde.cl
 */
export const API_HOST = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const TOKEN_KEY = 'sv_token';

// ── Estado General ───────────────────────────────────────────
export const ESTADO_GENERAL = {
  sin_gestion: 'Sin Gestión',
  en_proyecto: 'En Proyecto',
  tc6_aprobado: 'TC6 Aprobado',
  sello_verde: 'Sello Verde',
  sello_amarillo: 'Sello Amarillo',
  sello_rojo: 'Sello Rojo',
} as const;

export type EstadoGeneral = keyof typeof ESTADO_GENERAL;

// ── TC6 States ───────────────────────────────────────────────
export const TC6_ESTADOS = [
  { key: 'sin_iniciar',       label: 'Sin Iniciar' },
  { key: 'en_elaboracion',    label: 'En Elaboración' },
  { key: 'ingresado_sec',     label: 'Ingresado SEC' },
  { key: 'observado',         label: 'Observado' },
  { key: 'tc6_aprobado',      label: 'TC6 Aprobado' },
] as const;

export type Tc6Estado = typeof TC6_ESTADOS[number]['key'];

// ── Sello Types ──────────────────────────────────────────────
export const SELLO_TIPOS = {
  verde:    'Verde',
  amarillo: 'Amarillo',
  rojo:     'Rojo',
} as const;

export type SelloTipo = keyof typeof SELLO_TIPOS;

// ── Tipo Gas ─────────────────────────────────────────────────
export const TIPO_GAS_OPTIONS = ['GLP', 'Gas Natural'] as const;
export type TipoGas = typeof TIPO_GAS_OPTIONS[number];

// ── Abastecimiento ───────────────────────────────────────────
export const ABASTECIMIENTO_OPTIONS = [
  'GDR',
  'Equipo GLP',
  'Cilindros 45 kg',
  'Cilindros 11-15 kg',
  'GRANEL',
] as const;
export type Abastecimiento = typeof ABASTECIMIENTO_OPTIONS[number];

// ── Zona ─────────────────────────────────────────────────────
export const ZONA_OPTIONS = [
  'Casino',
  'Camarines',
  'Sala de clases',
  'Otros',
] as const;
export type Zona = typeof ZONA_OPTIONS[number];

// ── Defectos Anexo 3 ─────────────────────────────────────────
export const DEFECTOS_ANEXO3 = [
  { id: 'fugas_artefactos',  label: 'Fugas de gas en artefactos' },
  { id: 'fugas_red',         label: 'Fugas de gas en la red' },
  { id: 'fugas_medidor',     label: 'Fugas de gas en el medidor' },
  { id: 'sin_conducto',      label: 'Artefactos tipo B o C sin conducto de evacuación' },
  { id: 'co_50ppm',          label: 'Concentración de CO ambiente superior a 50 ppm' },
  { id: 'tipo_a_sala',       label: 'Artefacto tipo A en salas de clases y/o bibliotecas' },
  { id: 'tiro_cero',         label: 'Lectura de tiro igual a 0 o negativo' },
] as const;

export type DefectoId = typeof DEFECTOS_ANEXO3[number]['id'];

// ── Alerta Estado ────────────────────────────────────────────
export const ALERTA_ESTADOS = {
  activa:      'Activa',
  notificada:  'Notificada',
  resuelta:    'Resuelta',
} as const;

export type AlertaEstado = keyof typeof ALERTA_ESTADOS;

// ── Alerta Tipo ──────────────────────────────────────────────
export const ALERTA_TIPOS = {
  vencimiento_sello:   'Vencimiento Sello',
  plazo_regularizacion:'Plazo Regularización',
  tc6_pendiente:       'TC6 Pendiente',
} as const;

export type AlertaTipo = keyof typeof ALERTA_TIPOS;

// ── Badge color map ──────────────────────────────────────────
export const ESTADO_BADGE_CLASS: Record<string, string> = {
  sin_gestion:   'badge-gris',
  en_proyecto:   'badge-primary',
  tc6_aprobado:  'badge-primary',
  sello_verde:   'badge-verde',
  sello_amarillo:'badge-amarillo',
  sello_rojo:    'badge-rojo',
  verde:         'badge-verde',
  amarillo:      'badge-amarillo',
  rojo:          'badge-rojo',
  activa:        'badge-rojo',
  notificada:    'badge-amarillo',
  resuelta:      'badge-verde',
};

// ── Urgency helpers ──────────────────────────────────────────
export function getUrgencyClass(daysRemaining: number): string {
  if (daysRemaining < 30)  return 'alert-chip-urgent';
  if (daysRemaining < 90)  return 'alert-chip-warn';
  return 'alert-chip-ok';
}

export function getUrgencyColor(daysRemaining: number): string {
  if (daysRemaining < 30)  return 'var(--color-rojo)';
  if (daysRemaining < 90)  return 'var(--color-amarillo)';
  return 'var(--color-verde)';
}

// ── Date formatting ──────────────────────────────────────────
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CL', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
}

export function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 9999;
  const target = new Date(dateStr);
  const now    = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
