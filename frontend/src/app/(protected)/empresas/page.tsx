'use client';

import React from 'react';
import { EmpresasSection } from '@/components/registro/EmpresasSection';
import { CertificadoresSection } from '@/components/registro/CertificadoresSection';

/** Mantenimiento de los registros que se reutilizan al iniciar la gestión y al emitir un sello. */
export default function EmpresasPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div>
        <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)', margin: '0 0 var(--space-1)' }}>
          Empresas y certificadores
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
          Se registran una vez y se reutilizan: la empresa al iniciar la gestión de un establecimiento y el certificador al registrar una inspección.
        </p>
      </div>
      <EmpresasSection />
      <CertificadoresSection />
    </div>
  );
}
