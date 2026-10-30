'use client';

import { useEffect, useState } from 'react';
import { dashboardApi, vencimientosApi, DashboardStats, Vencimiento, ApiError } from '@/lib/api';

export function useDashboard() {
  const [stats, setStats]               = useState<DashboardStats | null>(null);
  const [vencimientos, setVencimientos] = useState<Vencimiento[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [s, v] = await Promise.all([
          dashboardApi.getStats(),
          vencimientosApi.list(false),
        ]);
        if (!cancelled) {
          setStats(s);
          // El tablero solo muestra lo que pide acción ya: fuera de plazo y próximos 30 días
          setVencimientos(v.items.filter((i) => i.urgencia === 'fuera_de_plazo' || i.urgencia === 'proximo_30d'));
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
          setVencimientos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { stats, vencimientos, loading, error };
}
