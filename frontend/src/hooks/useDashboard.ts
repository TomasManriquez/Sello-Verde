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
          // Fallback mock data for development
          setStats({
            total_ee:      20,
            sin_gestion:   4,
            en_proyecto:   8,
            tc6_aprobado:  3,
            sello_verde:   5,
            alertas_activas: 7,
          });
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
