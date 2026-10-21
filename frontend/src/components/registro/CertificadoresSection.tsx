'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { certificadoresApi, Certificador } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AccionesFila } from '@/components/ui/AccionesFila';
import { CertificadorFormModal } from './CertificadorFormModal';
import { ConfirmarEliminarModal } from './ConfirmarEliminarModal';

const titulo: React.CSSProperties = { fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-lg)', margin: 0 };
const sub: React.CSSProperties = { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' };

/** Registro de certificadores: alta, edición y eliminación. */
export function CertificadoresSection() {
  const [items, setItems] = useState<Certificador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Certificador | null>(null);
  const [eliminando, setEliminando] = useState<Certificador | null>(null);

  const load = useCallback(() => {
    certificadoresApi.list()
      .then((data) => { setItems(data); setError(null); })
      .catch((err) => setError(err.message || 'Error al cargar los certificadores'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((c) => !t || c.nombre.toLowerCase().includes(t) || (c.rut ?? '').toLowerCase().includes(t) || (c.entidad ?? '').toLowerCase().includes(t));
  }, [items, q]);

  return (
    <section aria-labelledby="certificadores-titulo" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div>
          <h2 id="certificadores-titulo" style={titulo}>Certificadores</h2>
          <span style={sub}>Personas que validan (inspeccionan) las instalaciones. Son independientes de la empresa contratista.</span>
        </div>
        <Button variant="secondary" onClick={() => { setEditando(null); setFormOpen(true); }}>+ Nuevo certificador</Button>
      </div>

      {items.length > 5 && (
        <div style={{ minWidth: 240, maxWidth: 320 }}>
          <Input label="Buscar" placeholder="Nombre, RUT o entidad" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      {aviso && <div role="status" style={{ color: 'var(--color-primary)', background: 'var(--color-primary-muted)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>✓ {aviso}</div>}
      {error && <div style={{ color: 'var(--color-rojo)', background: 'oklch(75% 0.1 20 / 0.1)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>{error}</div>}

      <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
        {loading ? (
          <div className="skeleton" style={{ height: 96 }} />
        ) : visibles.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
            <span className="empty-state-icon">🧑‍🔧</span>
            <p style={{ margin: 0 }}>{items.length === 0 ? 'Aún no hay certificadores registrados.' : 'Ningún certificador coincide con la búsqueda.'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RUT</th>
                  <th>Entidad</th>
                  <th>Contacto</th>
                  <th>Inspecciones</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                    <td>{c.rut ?? <span style={{ color: 'var(--color-text-subtle)' }}>—</span>}</td>
                    <td>{c.entidad ?? <span style={{ color: 'var(--color-text-subtle)' }}>—</span>}</td>
                    <td style={{ fontSize: 'var(--text-sm)', lineHeight: 1.4 }}>
                      {[c.telefono, c.email].filter(Boolean).map((v, i) => <div key={i}>{v}</div>)}
                      {!c.telefono && !c.email && <span style={{ color: 'var(--color-text-subtle)' }}>—</span>}
                    </td>
                    <td>{c.inspecciones ?? 0}</td>
                    <td style={{ textAlign: 'right' }}>
                      <AccionesFila
                        etiqueta={c.nombre}
                        onEditar={() => { setEditando(c); setFormOpen(true); }}
                        onEliminar={() => setEliminando(c)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CertificadorFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        certificador={editando}
        onSaved={() => { setAviso(editando ? 'Certificador actualizado.' : 'Certificador creado.'); load(); }}
      />
      <ConfirmarEliminarModal
        open={eliminando !== null}
        onClose={() => setEliminando(null)}
        tipo="certificador"
        nombre={eliminando?.nombre ?? ''}
        onConfirm={async () => {
          if (!eliminando) return;
          await certificadoresApi.remove(eliminando.id);
          setAviso('Certificador eliminado.');
          load();
        }}
      />
    </section>
  );
}
