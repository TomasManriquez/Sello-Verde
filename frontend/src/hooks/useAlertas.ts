'use client';

import { useEffect, useState, useCallback } from 'react';
import { alertasApi, Alerta, ApiError } from '@/lib/api';

export function useAlertas(params?: { tipo?: string; estado?: string }) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await alertasApi.list(params);
      setAlertas(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al cargar alertas');
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.tipo, params?.estado]);

  useEffect(() => { load(); }, [load]);

  const marcarResuelta = useCallback(async (id: number) => {
    try {
      await alertasApi.marcarResuelta(id);
      setAlertas(prev => prev.map(a => a.id === id ? { ...a, estado: 'resuelta' } : a));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    }
  }, []);

  return { alertas, loading, error, refetch: load, marcarResuelta };
}
