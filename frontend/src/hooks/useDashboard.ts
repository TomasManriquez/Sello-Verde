'use client';

import { useEffect, useState } from 'react';
import { dashboardApi, DashboardStats, Alerta, ApiError } from '@/lib/api';

export function useDashboard() {
  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [alertas, setAlertas]   = useState<Alerta[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [s, a] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getProximasAlertas(),
        ]);
        if (!cancelled) {
          setStats(s);
          setAlertas(a);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Error al cargar el tablero');
          }
          // Sin cifras ficticias: si la API falla, el tablero muestra el error (stats queda en null)
          setStats(null);
          setAlertas([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { stats, alertas, loading, error };
}
