import { API_BASE, TOKEN_KEY } from './constants';

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
  advanceTc6(id: number | string, estado: string) {
    return api.patch<Expediente>(`/expedientes/${id}/estado-tc6`, { nuevo_estado: estado });
  },
};

// ── Certificaciones ──────────────────────────────────────────
export const certificacionesApi = {
  list(expedienteId: number | string) {
    return api.get<Certificacion[]>(`/expedientes/${expedienteId}/certificaciones`);
  },
  create(expedienteId: number | string, data: Partial<Certificacion>) {
    return api.post<Certificacion>(`/expedientes/${expedienteId}/certificaciones`, data);
  },
};

// ── Documentos ───────────────────────────────────────────────
export const documentosApi = {
  list(expedienteId: number | string) {
    return api.get<Documento[]>(`/expedientes/${expedienteId}/documentos`);
  },
  upload(expedienteId: number | string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload<Documento>(`/expedientes/${expedienteId}/documentos`, fd);
  },
  delete(id: number | string) {
    return api.delete(`/documentos/${id}`);
  },
};

// ── Alertas ──────────────────────────────────────────────────
export const alertasApi = {
  list(params?: { tipo?: string; estado?: string }) {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null) as [string, string][]
    ).toString() : '';
    return api.get<Alerta[]>(`/alertas${qs}`);
  },
  listForExpediente(expedienteId: number | string) {
    return api.get<Alerta[]>(`/alertas?expediente_id=${expedienteId}`);
  },
  marcarResuelta(id: number | string) {
    return api.patch<Alerta>(`/alertas/${id}`, { estado: 'resuelta' });
  },
};

// ── Dashboard ────────────────────────────────────────────────
export const dashboardApi = {
  getStats() {
    return api.get<DashboardStats>('/dashboard/resumen');
  },
  getProximasAlertas() {
    return api.get<Alerta[]>('/dashboard/alertas-proximas');
  },
};

// ── Domain Types ─────────────────────────────────────────────
export interface Establecimiento {
  id: number;
  rbd: string;
  nombre: string;
  direccion: string;
  propietario: string;
  estado_general: string;
  locales?: Local[];
  expediente_activo?: Expediente;
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

export interface Instalacion {
  id: number;
  local_id: number;
  tipo_gas: string;
  abastecimiento: string;
  zona: string;
  referencia: string;
  artefacto: string;
}

export interface Expediente {
  id: number;
  establecimiento_id: number;
  establecimiento?: Establecimiento;
  empresa_instaladora: string;
  rut_empresa: string;
  estado_general: string;
  estado_tc6: string;
  monto_estimado?: number;
  observaciones?: string;
  alertas?: Alerta[];
  certificaciones?: Certificacion[];
  documentos?: Documento[];
  ultima_accion?: string;
  created_at: string;
  updated_at: string;
}

export interface Certificacion {
  id: number;
  expediente_id: number;
  inspector_nombre: string;
  entidad_certificadora: string;
  rut_inspector: string;
  fecha_inspeccion: string;
  tipo_sello: string;
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
  nombre: string;
  url: string;
  tipo_mime: string;
  tamanio: number;
  created_at: string;
}

export interface Alerta {
  id: number;
  expediente_id: number;
  establecimiento_nombre?: string;
  tipo_alerta: string;
  estado: string;
  fecha_vencimiento: string;
  dias_restantes: number;
  created_at: string;
}

export interface DashboardStats {
  total_ee: number;
  sin_gestion: number;
  en_proyecto: number;
  tc6_aprobado: number;
  sello_verde: number;
  alertas_activas: number;
}