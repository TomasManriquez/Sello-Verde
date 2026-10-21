'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { expedientesApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';

/**
 * El expediente ya no es una vista aparte: vive dentro de la ficha del establecimiento.
 * Esta ruta se mantiene solo para no romper enlaces antiguos y redirige a la ficha.
 */
export default function ExpedienteRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    expedientesApi.get(params.id as string)
      .then(exp => router.replace(`/establecimientos/${exp.establecimiento_id}`))
      .catch(err => setError(err.message || 'No se encontró el expediente'));
  }, [params.id, router]);

  if (error) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <Button onClick={() => router.push('/establecimientos')} variant="secondary" style={{ marginBottom: 'var(--space-4)' }}>
          ← Volver a establecimientos
        </Button>
        <div style={{ color: 'var(--color-rojo)' }}>{error}</div>
      </div>
    );
  }

  return <div className="skeleton" style={{ height: '48px', width: '240px' }} />;
}
