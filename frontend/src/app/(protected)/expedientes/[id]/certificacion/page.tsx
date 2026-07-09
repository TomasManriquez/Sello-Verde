'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CertificacionForm } from '@/components/forms/CertificacionForm';
import { Button } from '@/components/ui/Button';
import { expedientesApi, Expediente } from '@/lib/api';

export default function CertificacionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    expedientesApi.get(id)
      .then(data => setExpediente(data))
      .catch(() => setExpediente(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="skeleton" style={{ height: '48px', width: '200px' }} />
        <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-xl)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div>
        <Button onClick={() => router.push(`/expedientes/${id}`)} variant="ghost" size="sm" style={{ paddingLeft: 0, marginBottom: 'var(--space-2)' }}>
          ← Volver a Expediente
        </Button>
        <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)' }}>
          Registrar Certificación de Gas
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          Registre los detalles de la inspección técnica de la SEC.
          {expediente?.establecimiento && (
            <> · <strong>{expediente.establecimiento.nombre}</strong></>
          )}
        </p>
      </div>

      <div className="surface" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)' }}>
        <CertificacionForm
          expedienteId={id}
          establecimientoId={expediente?.establecimiento_id ?? 0}
          onComplete={() => {
            router.push(`/expedientes/${id}`);
          }}
        />
      </div>
    </div>
  );
}
