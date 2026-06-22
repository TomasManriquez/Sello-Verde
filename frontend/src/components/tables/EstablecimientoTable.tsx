'use client';

import React from 'react';
import Link from 'next/link';
import { Establecimiento } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/constants';

interface EstablecimientoTableProps {
  establecimientos: Establecimiento[];
  loading?: boolean;
}

export function EstablecimientoTable({ establecimientos, loading }: EstablecimientoTableProps) {
  if (loading) {
    return (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {['RBD', 'Nombre', 'Estado', 'Última Cert.', 'Alertas', 'Acciones'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j}>
                    <div className="skeleton" style={{ height: '1rem', width: j === 1 ? '180px' : '80px' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!establecimientos.length) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">🏫</span>
        <p>No se encontraron establecimientos</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>RBD</th>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Última Cert.</th>
            <th>Alertas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {establecimientos.map((ee, i) => {
            const alertasActivas = ee.expediente_activo?.alertas?.filter(
              a => a.estado === 'activa'
            ).length ?? 0;
            const ultimaCert = ee.expediente_activo?.certificaciones?.[0]?.fecha_inspeccion;

            return (
              <tr key={ee.id} className={`animate-fade-up stagger-${Math.min(i + 1, 6)}`}>
                <td>
                  <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                    {ee.rbd}
                  </span>
                </td>
                <td>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ee.nombre}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {ee.direccion}
                    </div>
                  </div>
                </td>
                <td>
                  <Badge estado={ee.estado_general} />
                </td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  {ultimaCert ? formatDate(ultimaCert) : '—'}
                </td>
                <td>
                  {alertasActivas > 0 ? (
                    <span
                      className="badge badge-rojo"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      ⚠ {alertasActivas}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-text-subtle)', fontSize: 'var(--text-xs)' }}>—</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Link
                      href={`/establecimientos/${ee.id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Ver
                    </Link>
                    {ee.expediente_activo && (
                      <Link
                        href={`/expedientes/${ee.expediente_activo.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Expediente
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
