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
// Debe reflejar el enum EstadoGeneral del backend (más `tc6_aprobado`, usado solo como
// etapa TC6 en badges). `en_certificacion` es un valor legado que se muestra igual que
// `en_regularizacion`.
export const ESTADO_GENERAL = {
  sin_gestion: 'Sin Gestión',
  en_levantamiento: 'En Levantamiento',
  en_proyecto: 'En Proyecto TC6',
  en_regularizacion: 'Obras / Regularización',
  en_certificacion: 'Obras / Regularización',
  sello_verde: 'Sello Verde',
  sello_amarillo: 'Sello Amarillo',
  sello_rojo: 'Sello Rojo',
  tc6_aprobado: 'TC6 Aprobado',
} as const;

export type EstadoGeneral = keyof typeof ESTADO_GENERAL;

/** Estados ofrecidos en los filtros (sin duplicados ni valores legados). */
export const ESTADO_GENERAL_OPCIONES: EstadoGeneral[] = [
  'sin_gestion',
  'en_levantamiento',
  'en_proyecto',
  'en_regularizacion',
  'sello_verde',
  'sello_amarillo',
  'sello_rojo',
];

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

// ── Carpetas de documentos ───────────────────────────────────
// Claves = valores de CategoriaDocumento en el backend
export const CATEGORIAS_DOCUMENTO = [
  { key: 'planos_diseno',      label: 'Planos de diseño',        hint: 'Planos y proyecto de diseño' },
  { key: 'actas_reparaciones', label: 'Actas de reparaciones',   hint: 'Actas de obras y reparaciones' },
  { key: 'memorias_tecnicas',  label: 'Memorias técnicas',       hint: 'Memorias de cálculo y técnicas' },
  { key: 'certificados_sec',   label: 'Certificados SEC',        hint: 'Certificados, TC6 aprobado y resoluciones' },
  { key: 'otros',              label: 'Otros documentos',        hint: 'Todo lo que no calza en las demás carpetas' },
] as const;

export type CategoriaDocumento = typeof CATEGORIAS_DOCUMENTO[number]['key'];

// ── Defectos Anexo 3 ─────────────────────────────────────────
export const DEFECTOS_ANEXO3 = [
  { id: 'fugas_artefactos',  label: 'Fugas de gas en artefactos' },
  { id: 'fugas_red',         label: 'Fugas de gas en la red' },
  { id: 'fugas_medidor',     label: 'Fugas de gas en el medidor' },
  { id: 'sin_conducto_evacuacion',      label: 'Artefactos tipo B o C sin conducto de evacuación' },
  { id: 'co_superior_50ppm',          label: 'Concentración de CO ambiente superior a 50 ppm' },
  { id: 'artefacto_a_en_aulas',       label: 'Artefacto tipo A en salas de clases y/o bibliotecas' },
  { id: 'lectura_tiro_igual',         label: 'Lectura de tiro igual a 0 o negativo' },
] as const;

export type DefectoId = typeof DEFECTOS_ANEXO3[number]['id'];

// ── Badge color map ──────────────────────────────────────────
export const ESTADO_BADGE_CLASS: Record<string, string> = {
  sin_gestion:   'badge-gris',
  en_levantamiento: 'badge-gris',
  en_proyecto:   'badge-primary',
  en_regularizacion: 'badge-primary',
  en_certificacion:  'badge-primary',
  tc6_aprobado:  'badge-primary',
  sello_verde:   'badge-verde',
  sello_amarillo:'badge-amarillo',
  sello_rojo:    'badge-rojo',
  verde:         'badge-verde',
  amarillo:      'badge-amarillo',
  rojo:          'badge-rojo',
};

// ── Urgency helpers ──────────────────────────────────────────
export function getUrgencyColor(daysRemaining: number): string {
  if (daysRemaining < 30)  return 'var(--color-rojo)';
  if (daysRemaining < 90)  return 'var(--color-amarillo)';
  return 'var(--color-verde)';
}

// ── Date formatting ──────────────────────────────────────────
/**
 * Una fecha sin hora ('2026-10-23', columnas `date` de la API) es un día de calendario:
 * `new Date('2026-10-23')` la toma como UTC y en Chile queda el día anterior.
 */
function aFechaLocal(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dateStr);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = aFechaLocal(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CL', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
}

export function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 9999;
  const target = aFechaLocal(dateStr);
  const now    = new Date();
  // Comparar contra el inicio de hoy: así un día de calendario no depende de la hora actual
  const hoy    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

/** Texto corto que identifica una instalación: "Local 1 · Casino · Cilindros 45 kg". */
export function instalacionLabel(
  inst?: {
    zona_abastecimiento?: string | null;
    referencia?: string | null;
    abastecimiento?: string | null;
    local?: { numero_local: number } | null;
  } | null,
): string {
  if (!inst) return '';
  return [
    inst.local ? `Local ${inst.local.numero_local}` : null,
    inst.zona_abastecimiento,
    inst.referencia,
    inst.abastecimiento,
  ].filter(Boolean).join(' · ');
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
