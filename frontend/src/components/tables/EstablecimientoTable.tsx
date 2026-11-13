'use client';

import React, { useEffect, useRef } from 'react';
import { Trash } from 'lucide-react';
import Link from 'next/link';
import { Establecimiento } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { daysUntil, formatDate, getUrgencyColor } from '@/lib/constants';

interface EstablecimientoTableProps {
  establecimientos: Establecimiento[];
  loading?: boolean;
  /** Mensaje cuando no hay filas (por ejemplo, al filtrar por etapa) */
  emptyMessage?: string;
  /** Si se entrega, la tabla muestra casillas de selección */
  seleccion?: {
    ids: Set<number>;
    onToggle: (id: number) => void;
    onToggleTodos: (marcar: boolean) => void;
  };
  /** Si se entrega, cada fila muestra el botón de eliminar */
  onEliminar?: (ee: Establecimiento) => void;
}

const COLUMNAS = ['RBD', 'Establecimiento', 'Etapa', 'Instalaciones', 'Próximo vencimiento', ''];

/** Resumen corto del estado de las instalaciones: "2 de 3 con sello verde · 1 sin inspección". */
function ResumenInstalaciones({ ee }: { ee: Establecimiento }) {
  const r = ee.resumen_sellos;
  if (!r || r.total_instalaciones === 0) {
    return <span style={{ color: 'var(--color-text-subtle)', fontSize: 'var(--text-xs)' }}>Sin instalaciones</span>;
  }
  const detalles = [
    r.rojos > 0 ? `${r.rojos} rojo${r.rojos > 1 ? 's' : ''}` : null,
    r.amarillos > 0 ? `${r.amarillos} amarillo${r.amarillos > 1 ? 's' : ''}` : null,
    r.sin_inspeccion > 0 ? `${r.sin_inspeccion} sin inspección` : null,
  ].filter(Boolean);
  return (
    <div style={{ lineHeight: 1.3 }}>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
        {r.verdes} de {r.total_instalaciones} con sello verde
      </div>
      {detalles.length > 0 && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{detalles.join(' · ')}</div>
      )}
    </div>
  );
}

function ProximoVencimiento({ ee }: { ee: Establecimiento }) {
  const fecha = ee.resumen_sellos?.proximo_vencimiento;
  if (!fecha) return <span style={{ color: 'var(--color-text-subtle)' }}>—</span>;
  const dias = daysUntil(fecha);
  return (
    <div style={{ lineHeight: 1.3 }}>
      <div style={{ fontSize: 'var(--text-sm)' }}>{formatDate(fecha)}</div>
      <strong style={{ fontSize: 'var(--text-xs)', color: getUrgencyColor(dias) }}>
        {dias < 0 ? `Vencido hace ${Math.abs(dias)} d` : `en ${dias} días`}
      </strong>
    </div>
  );
}

const celdaCheck: React.CSSProperties = { width: 44, textAlign: 'center' };
const check: React.CSSProperties = { width: 20, height: 20, accentColor: 'var(--color-primary)', cursor: 'pointer' };

export function EstablecimientoTable({ establecimientos, loading, emptyMessage, seleccion, onEliminar }: EstablecimientoTableProps) {
  const cabeceraRef = useRef<HTMLInputElement>(null);
  const marcados = seleccion ? establecimientos.filter((e) => seleccion.ids.has(e.id)).length : 0;
  const todos = establecimientos.length > 0 && marcados === establecimientos.length;

  // Estado intermedio de la casilla de "seleccionar todos"
  useEffect(() => {
    if (cabeceraRef.current) cabeceraRef.current.indeterminate = marcados > 0 && !todos;
  }, [marcados, todos]);

  if (loading) {
    return (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>{COLUMNAS.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {COLUMNAS.map((_, j) => (
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
        <p>{emptyMessage ?? 'No se encontraron establecimientos'}</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {seleccion && (
              <th style={celdaCheck}>
                <input
                  ref={cabeceraRef}
                  type="checkbox"
                  checked={todos}
                  onChange={(e) => seleccion.onToggleTodos(e.target.checked)}
                  aria-label="Seleccionar todos los establecimientos de la lista"
                  style={check}
                />
              </th>
            )}
            {COLUMNAS.map((h, i) => <th key={i}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {establecimientos.map((ee, i) => (
            <tr key={ee.id} className={`animate-fade-up stagger-${Math.min(i + 1, 6)}`}>
              {seleccion && (
                <td style={celdaCheck}>
                  <input
                    type="checkbox"
                    checked={seleccion.ids.has(ee.id)}
                    onChange={() => seleccion.onToggle(ee.id)}
                    aria-label={`Seleccionar ${ee.nombre}`}
                    style={check}
                  />
                </td>
              )}
              <td>
                <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-sm)' }}>{ee.rbd}</span>
              </td>
              <td>
                <Link href={`/establecimientos/${ee.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <div style={{ fontWeight: 600 }}>{ee.nombre}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {[ee.direccion, ee.comuna].filter(Boolean).join(' · ')}
                  </div>
                </Link>
              </td>
              <td><Badge estado={ee.estado_general} /></td>
              <td><ResumenInstalaciones ee={ee} /></td>
              <td><ProximoVencimiento ee={ee} /></td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <Link href={`/establecimientos/${ee.id}`} className="btn btn-secondary btn-sm">Abrir ficha</Link>
                {onEliminar && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onEliminar(ee)}
                    aria-label={`Eliminar ${ee.nombre}`}
                    title="Eliminar establecimiento"
                    style={{ color: 'var(--color-rojo)', minWidth: 44, minHeight: 44, marginLeft: 'var(--space-1)' }}
                  >
                    <Trash size={16} aria-hidden="true" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
