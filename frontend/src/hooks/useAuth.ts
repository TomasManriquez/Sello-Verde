'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, clearToken } from '@/lib/api';

interface User {
  id: number;
  email: string;
  nombre: string;
}

export function useAuth(requireAuth = true) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      if (requireAuth) {
        router.replace('/login');
      }
      return;
    }

    // Decode JWT payload (no verification — backend handles that)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({
        id:     payload.sub ?? payload.id,
        email:  payload.email ?? '',
        nombre: payload.nombre ?? payload.name ?? 'Usuario',
      });
    } catch {
      clearToken();
      if (requireAuth) router.replace('/login');
    } finally {
      setLoading(false);
    }
  }, [router, requireAuth]);

  const logout = useCallback(() => {
    clearToken();
    router.replace('/login');
  }, [router]);

  return { user, loading, logout };
}
