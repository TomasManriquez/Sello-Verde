'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CertificacionForm } from '@/components/forms/CertificacionForm';
import { Button } from '@/components/ui/Button';

export default function CertificacionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

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
        </p>
      </div>

      <div className="surface" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)' }}>
        <CertificacionForm
          expedienteId={id}
          onComplete={() => {
            router.push(`/expedientes/${id}`);
          }}
        />
      </div>
    </div>
  );
}
