'use client';

import { useCallback, useEffect, useState } from 'react';
import { vencimientosApi, ApiError, ResumenVencimientos, Vencimiento } from '@/lib/api';

export function useVencimientos(incluirAlDia = false) {
  const [items, setItems] = useState<Vencimiento[]>([]);
  const [resumen, setResumen] = useState<ResumenVencimientos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vencimientosApi.list(incluirAlDia);
      setItems(data.items);
      setResumen(data.resumen);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar los vencimientos');
      setItems([]);
      setResumen(null);
    } finally {
      setLoading(false);
    }
  }, [incluirAlDia]);

  useEffect(() => { load(); }, [load]);

  return { items, resumen, loading, error, refetch: load };
}
