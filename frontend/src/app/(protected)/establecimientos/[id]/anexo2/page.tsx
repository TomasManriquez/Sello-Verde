'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { establecimientosApi, Establecimiento, Local } from '@/lib/api';
import { Anexo2Form } from '@/components/forms/Anexo2Form';
import { Button } from '@/components/ui/Button';

export default function Anexo2Page() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [ee, setEe] = useState<Establecimiento | null>(null);
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      establecimientosApi.get(id)
        .then(data => {
          setEe(data);
          setLocales(data.locales ?? []);
        })
        .catch(err => {
          setError(err.message || 'Error al cargar los datos del establecimiento');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="skeleton" style={{ height: '48px', width: '200px' }} />
        <div className="skeleton" style={{ height: '500px' }} />
      </div>
    );
  }

  if (error || !ee) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <Button onClick={() => router.push(`/establecimientos/${id}`)} variant="secondary" style={{ marginBottom: 'var(--space-4)' }}>
          ← Volver a Ficha
        </Button>
        <div style={{ color: 'var(--color-rojo)', background: 'oklch(75% 0.1 20 / 0.1)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          {error || 'Establecimiento no encontrado'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div>
        <Button onClick={() => router.push(`/establecimientos/${id}`)} variant="ghost" size="sm" style={{ paddingLeft: 0, marginBottom: 'var(--space-2)' }}>
          ← Volver a Ficha del Establecimiento
        </Button>
        <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)' }}>
          Formulario de Levantamiento — Anexo 2 SEC
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          Registre las instalaciones de gas de cada uno de los locales del establecimiento.
        </p>
      </div>

      <div className="surface" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)' }}>
        <Anexo2Form
          establecimiento={ee}
          locales={locales}
          onSaved={() => {
            setTimeout(() => {
              router.push(`/establecimientos/${id}`);
            }, 1500);
          }}
        />
      </div>
    </div>
  );
}
