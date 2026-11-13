import { API_BASE, API_HOST, TOKEN_KEY } from './constants';

// ── File URL helper ──────────────────────────────────────────
/**
 * Builds an absolute URL for a static file given its relative path.
 * The relative path comes from the backend (e.g. "/uploads/expedientes/4/file.pdf").
 * In production, NEXT_PUBLIC_API_URL controls the host.
 *
 * @example buildFileUrl('/uploads/expedientes/4/file.pdf')
 * // → 'http://localhost:3001/uploads/expedientes/4/file.pdf'  (dev)
 * // → 'https://api.selloverde.cl/uploads/expedientes/4/file.pdf'  (prod)
 */
export function buildFileUrl(relativePath: string): string {
  if (!relativePath) return '';
  const base = API_HOST.replace(/\/$/, '');
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${base}${path}`;
}

// ── Types ────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Auth helpers ─────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearToken(): void {
  setToken(null);
}

// ── Core fetch wrapper ───────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  if (authenticated) {
    const token = getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        message = body?.message ?? body?.error ?? message;
      } catch {
        // ignore JSON parse errors
      }

      if (res.status === 401) {
        clearToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }

      throw new ApiError(res.status, message);
    }

  if (res.status === 204) return undefined as T;

  const json = await res.json();

  // AUTOMATIC UNWRAPPER: If response is { data: T, ... }, return T
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}

// ── HTTP verbs ───────────────────────────────────────────────
export const api = {
  get<T>(path: string, auth = true) {
    return request<T>(path, { method: 'GET' }, auth);
  },
  post<T>(path: string, body: unknown, auth = true) {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }, auth);
  },
  put<T>(path: string, body: unknown, auth = true) {
    return request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, auth);
  },
  patch<T>(path: string, body: unknown, auth = true) {
    return request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, auth);
  },
  delete<T>(path: string, auth = true) {
    return request<T>(path, { method: 'DELETE' }, auth);
  },
  upload<T>(path: string, formData: FormData, auth = true) {
    const headers: HeadersInit = {};
    if (auth) {
      const token = getToken();
      if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }
    }
    return fetch(`${API_BASE}${path}`, {
      method: 'POST',
      body: formData,
      headers,
    }).then(async (res) => {
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          message = body?.message ?? body?.error ?? message;
        } catch { /* ignore */ }
        throw new ApiError(res.status, message);
      }
      const json = await res.json();
      return (json && typeof json === 'object' && 'data' in json) ? json.data : json;
    });
  },
};

// ── Auth endpoints ───────────────────────────────────────────
export const authApi = {
  login(email: string, password: string) {
    // We keep the envelope here because the Login page needs the 'message' and 'user'
    return api.post<{
      access_token: string;
      user: { id: number; email: string; nombre: string };
    }>('/auth/login', { email, password }, false);
  },
};

// ── Establecimientos ─────────────────────────────────────────
export const establecimientosApi = {
  list(params?: { estado_general?: string; search?: string }) {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null) as [string, string][]
    ).toString() : '';
    return api.get<Establecimiento[]>(`/establecimientos${qs}`);
  },
  get(id: number | string) {
    return api.get<Establecimiento>(`/establecimientos/${id}`);
  },
  create(data: Partial<Establecimiento>) {
    return api.post<Establecimiento>('/establecimientos', data);
  },
  update(id: number | string, data: Partial<Establecimiento>) {
    return api.put<Establecimiento>(`/establecimientos/${id}`, data);
  },
  remove(id: number | string) {
    return api.delete(`/establecimientos/${id}`);
  },
  /** Descarga un Excel (una hoja) con los establecimientos indicados. */
  async exportExcel(ids: number[]): Promise<void> {
    const token = getToken();
    const res = await fetch(`${API_BASE}/establecimientos/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message ?? message;
      } catch { /* ignore */ }
      if (res.status === 401) {
        clearToken();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
      throw new ApiError(res.status, message);
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `establecimientos_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ── Locales ──────────────────────────────────────────────────
export const localesApi = {
  list(establecimientoId: number | string) {
    return api.get<Local[]>(`/establecimientos/${establecimientoId}/locales`);
  },
  create(establecimientoId: number | string, data: Partial<Local>) {
    return api.post<Local>(`/establecimientos/${establecimientoId}/locales`, data);
  },
  update(id: number | string, data: Partial<Local>) {
    return api.put<Local>(`/locales/${id}`, data);
  },
  addInstalacion(localId: number | string, data: Partial<Instalacion>) {
    return api.post<Instalacion>(`/locales/${localId}/instalaciones`, data);
  },
  updateInstalacion(id: number | string, data: Partial<Instalacion>) {
    return api.put<Instalacion>(`/instalaciones/${id}`, data);
  },
  /** Elimina el local junto con sus instalaciones (borrado lógico) */
  remove(id: number | string) {
    return api.delete<{ instalaciones_eliminadas: number }>(`/locales/${id}`);
  },
  deleteInstalacion(id: number | string) {
    return api.delete(`/instalaciones/${id}`);
  },
};

// ── Expedientes ──────────────────────────────────────────────
export const expedientesApi = {
  list(params?: { estado_general?: string }) {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null) as [string, string][]
    ).toString() : '';
    return api.get<Expediente[]>(`/expedientes${qs}`);
  },
  get(id: number | string) {
    return api.get<Expediente>(`/expedientes/${id}`);
  },
  create(data: Partial<Expediente>) {
    return api.post<Expediente>('/expedientes', data);
  },
  update(id: number | string, data: Partial<Expediente>) {
    return api.put<Expediente>(`/expedientes/${id}`, data);
  },
  /** Asigna una empresa a varios establecimientos (inicia la gestión de los que no la tienen) */
  asignarEmpresa(establecimientoIds: number[], empresaId: number) {
    return api.post<{ actualizados: number; creados: number; omitidos: number[] }>(
      '/expedientes/asignar-empresa',
      { establecimiento_ids: establecimientoIds, empresa_id: empresaId },
    );
  },
  advanceTc6(id: number | string, estado: string) {
    return api.patch<Expediente>(`/expedientes/${id}/estado-tc6`, { nuevo_estado: estado });
  },
};

// ── Certificaciones ──────────────────────────────────────────
export interface UpdateCertificacionPayload {
  tipo_sello?: string;
  certificador_id?: number;
  fecha_inspeccion?: string;
  numero_certificado?: string;
  observaciones?: string;
  local_id?: number;
  instalacion_id?: number;
  defectos?: { tipo_defecto: string; instalacion_afectada?: string }[];
}

export const certificacionesApi = {
  list(expedienteId: number | string) {
    return api.get<Certificacion[]>(`/expedientes/${expedienteId}/certificaciones`);
  },
  create(expedienteId: number | string, data: Partial<Certificacion>) {
    return api.post<Certificacion>(`/expedientes/${expedienteId}/certificaciones`, data);
  },
  update(id: number | string, data: UpdateCertificacionPayload) {
    return api.patch<Certificacion>(`/certificaciones/${id}`, data);
  },
};

// ── Documentos ───────────────────────────────────────────────
export const documentosApi = {
  list(expedienteId: number | string) {
    return api.get<Documento[]>(`/expedientes/${expedienteId}/documentos`);
  },
  upload(expedienteId: number | string, file: File, categoria: string = 'otros') {
    const fd = new FormData();
    fd.append('categoria', categoria);
    fd.append('file', file);
    return api.upload<Documento>(`/expedientes/${expedienteId}/documentos`, fd);
  },
  rename(id: number | string, nombre: string) {
    return api.patch<Documento>(`/documentos/${id}/renombrar`, { nombre });
  },
  /** Mueve el documento a otra carpeta */
  setCategoria(id: number | string, categoria: string) {
    return api.patch<Documento>(`/documentos/${id}/categoria`, { categoria });
  },
  /** Returns the absolute download URL for a document (forces download via Content-Disposition). */
  downloadUrl(id: number | string): string {
    return `${API_BASE}/documentos/${id}/descargar`;
  },
  delete(id: number | string) {
    return api.delete(`/documentos/${id}`);
  },
};

// ── Empresas (contratistas) ──────────────────────────────────
export const empresasApi = {
  list(params?: { activa?: boolean; q?: string }) {
    const qs = new URLSearchParams();
    if (params?.activa !== undefined) qs.set('activa', String(params.activa));
    if (params?.q) qs.set('q', params.q);
    const s = qs.toString();
    return api.get<Empresa[]>(`/empresas${s ? `?${s}` : ''}`);
  },
  create(data: EmpresaPayload) {
    return api.post<Empresa>('/empresas', data);
  },
  update(id: number, data: Partial<EmpresaPayload> & { activa?: boolean }) {
    return api.put<Empresa>(`/empresas/${id}`, data);
  },
  /** Elimina la empresa del registro (si ya está en el historial se conserva solo su nombre allí) */
  remove(id: number) {
    return api.delete<{ conservada: boolean; usos: number }>(`/empresas/${id}`);
  },
};

// ── Certificadores ───────────────────────────────────────────
export const certificadoresApi = {
  list(params?: { activo?: boolean; q?: string }) {
    const qs = new URLSearchParams();
    if (params?.activo !== undefined) qs.set('activo', String(params.activo));
    if (params?.q) qs.set('q', params.q);
    const s = qs.toString();
    return api.get<Certificador[]>(`/certificadores${s ? `?${s}` : ''}`);
  },
  create(data: CertificadorPayload) {
    return api.post<Certificador>('/certificadores', data);
  },
  update(id: number, data: Partial<CertificadorPayload> & { activo?: boolean }) {
    return api.put<Certificador>(`/certificadores/${id}`, data);
  },
  /** Elimina al certificador del registro (si ya está en el historial se conserva solo su nombre allí) */
  remove(id: number) {
    return api.delete<{ conservado: boolean; usos: number }>(`/certificadores/${id}`);
  },
};

// ── Vencimientos (derivados del sello de cada instalación) ───
// ── Catálogo de establecimientos del SLEP ────────────────────
export interface EstablecimientoCatalogo {
  rbd: string;
  nombre: string;
  comuna: string;
  direccion: string;
  region: string;
}

export const catalogoApi = {
  /** Datos de referencia por RBD ("7976" o "7976-6"); 404 si no está en el listado. */
  buscarEstablecimiento(rbd: string) {
    return api.get<EstablecimientoCatalogo>(`/catalogo/establecimientos/${encodeURIComponent(rbd)}`);
  },
};

export const vencimientosApi = {
  /** Por defecto solo los que piden atención; `incluirAlDia` agrega los sellos verdes con más de 90 días. */
  list(incluirAlDia = false) {
    return api.get<VencimientosResponse>(`/vencimientos${incluirAlDia ? '?incluir_al_dia=true' : ''}`);
  },
};

// ── Dashboard ────────────────────────────────────────────────
export const dashboardApi = {
  getStats() {
    return api.get<DashboardStats>('/dashboard/resumen');
  },
};

// ── Domain Types ─────────────────────────────────────────────
export interface Establecimiento {
  id: number;
  rbd: string;
  nombre: string;
  direccion: string;
  comuna?: string;
  region?: string;
  nombre_propietario?: string;
  propietario?: string; // alias legacy
  estado_general: string;
  cantidad_locales?: number;
  locales?: Local[];
  expedientes?: Expediente[];
  expediente_activo?: Expediente;
  resumen_sellos?: ResumenSellos;
  created_at: string;
  updated_at: string;
}

export interface Local {
  id: number;
  establecimiento_id: number;
  numero_local: number;
  nombre: string;
  direccion: string;
  usa_gas: boolean;
  instalaciones?: Instalacion[];
}

export type EstadoSello = 'sin_inspeccion' | 'verde' | 'verde_vencido' | 'amarillo' | 'rojo';

/** Sello vigente de una instalación (calculado por el backend a partir de sus inspecciones) */
export interface SelloInstalacion {
  instalacion_id: number;
  local_id: number;
  numero_local: number;
  estado_sello: EstadoSello;
  tipo_sello: 'verde' | 'amarillo' | 'rojo' | null;
  certificacion_id: number | null;
  fecha_inspeccion: string | null;
  /** Verde: vencimiento a 2 años. Amarillo/rojo: fin del plazo de 90 días. */
  fecha_limite: string | null;
  dias_restantes: number | null;
  plazo_vencido: boolean;
}

export interface ResumenSellos {
  total_instalaciones: number;
  verdes: number;
  amarillos: number;
  rojos: number;
  vencidos: number;
  sin_inspeccion: number;
  proximo_vencimiento: string | null;
}

export interface Instalacion {
  id: number;
  local_id: number;
  /** Solo viene en GET /establecimientos y /establecimientos/:id */
  sello?: SelloInstalacion | null;
  tipo_gas?: string | null;
  abastecimiento?: string | null;
  zona_abastecimiento?: string | null;
  referencia?: string | null;
  artefacto_cilindro?: string | null;
}

/** Empresa contratista: provee insumos técnicos y mano de obra de la instalación */
export interface Empresa {
  id: number;
  rut: string | null;
  razon_social: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  activa: boolean;
  /** Establecimientos que atiende (solo en el listado) */
  establecimientos?: { id: number; nombre: string }[];
}

/** Persona que valida (inspecciona) una instalación. Independiente de la empresa contratista. */
export interface Certificador {
  id: number;
  rut: string | null;
  nombre: string;
  entidad: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  /** Inspecciones que ha validado (solo en el listado) */
  inspecciones?: number;
}

export type EmpresaPayload = {
  razon_social: string;
  rut?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
};

export type CertificadorPayload = {
  nombre: string;
  rut?: string;
  entidad?: string;
  telefono?: string;
  email?: string;
};

export interface Expediente {
  id: number;
  establecimiento_id: number;
  establecimiento?: Establecimiento;
  empresa_id?: number | null;
  empresa?: Empresa | null;
  /** Dato anterior a la entidad Empresa (respaldo) */
  empresa_instaladora?: string;
  rut_empresa?: string;
  estado_general: string;
  estado_tc6: string;
  monto_estimado?: number;
  observaciones?: string;
  certificaciones?: Certificacion[];
  documentos?: Documento[];
  /** Sello vigente por instalación (solo en GET /expedientes/:id) */
  sellos_instalaciones?: SelloInstalacion[];
  ultima_accion?: string;
  created_at: string;
  updated_at: string;
}

export interface Certificacion {
  id: number;
  expediente_id: number;
  local_id?: number;
  instalacion_id?: number;
  local?: Local;
  instalacion?: Instalacion;
  certificador_id?: number | null;
  certificador?: Certificador | null;
  /** Datos anteriores a la entidad Certificador (respaldo) */
  nombre_inspector?: string;
  entidad_certificadora?: string;
  rut_inspector?: string;
  fecha_inspeccion: string;
  tipo_sello: string;
  numero_certificado?: string;
  observaciones?: string;
  defectos?: Defecto[];
  created_at: string;
}

export interface Defecto {
  id: number;
  certificacion_id: number;
  tipo: string;
  instalacion_afectada: string;
}

export interface Documento {
  id: number;
  expediente_id: number;
  nombre_original: string;
  nombre_archivo: string;
  descripcion?: string;
  /** Relative path from backend, e.g. "/uploads/expedientes/4/file.pdf" */
  url: string;
  tipo_mime: string;
  tamano_bytes: number;
  /** Carpeta en que se clasifica el documento */
  categoria: string;
  created_at: string;
  updated_at: string;
}

export type UrgenciaVencimiento = 'fuera_de_plazo' | 'proximo_30d' | 'proximo_90d' | 'al_dia';

export type MotivoVencimiento =
  | 'verde_vigente'
  | 'verde_por_vencer'
  | 'verde_vencido'
  | 'regularizacion'
  | 'plazo_vencido';

/** Plazo que corre para una instalación, derivado de su sello vigente (no se guarda ni se resuelve a mano). */
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
  tipo_sello: 'verde' | 'amarillo' | 'rojo' | null;
  estado_sello: EstadoSello;
  fecha_inspeccion: string | null;
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
  /** Fuera de plazo + próximos 30 días */
  requieren_accion: number;
}

export interface VencimientosResponse {
  items: Vencimiento[];
  resumen: ResumenVencimientos;
}

export interface DashboardStats {
  total_ee: number;
  sin_gestion: number;
  en_levantamiento: number;
  en_proyecto: number;
  en_regularizacion: number;
  en_certificacion: number; // legado
  sello_verde: number;
  sello_amarillo: number;
  sello_rojo: number;
  vencimientos: ResumenVencimientos;
}