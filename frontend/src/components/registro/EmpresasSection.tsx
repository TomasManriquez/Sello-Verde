'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { empresasApi, Empresa } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AccionesFila } from '@/components/ui/AccionesFila';
import { EmpresaFormModal } from './EmpresaFormModal';
import { ConfirmarEliminarModal } from './ConfirmarEliminarModal';

const titulo: React.CSSProperties = { fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-lg)', margin: 0 };
const sub: React.CSSProperties = { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' };

/** Registro de empresas contratistas: alta, edición y eliminación. */
export function EmpresasSection() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [eliminando, setEliminando] = useState<Empresa | null>(null);

  const load = useCallback(() => {
    empresasApi.list()
      .then((data) => { setEmpresas(data); setError(null); })
      .catch((err) => setError(err.message || 'Error al cargar las empresas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return empresas.filter((e) => !t || e.razon_social.toLowerCase().includes(t) || (e.rut ?? '').toLowerCase().includes(t));
  }, [empresas, q]);

  return (
    <section aria-labelledby="empresas-titulo" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div>
          <h2 id="empresas-titulo" style={titulo}>Empresas contratistas</h2>
          <span style={sub}>Proveen los insumos técnicos y la mano de obra de la instalación de gas.</span>
        </div>
        <Button onClick={() => { setEditando(null); setFormOpen(true); }}>+ Nueva empresa</Button>
      </div>

      {empresas.length > 5 && (
        <div style={{ minWidth: 240, maxWidth: 320 }}>
          <Input label="Buscar" placeholder="Razón social o RUT" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      {aviso && <div role="status" style={{ color: 'var(--color-primary)', background: 'var(--color-primary-muted)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>✓ {aviso}</div>}
      {error && <div style={{ color: 'var(--color-rojo)', background: 'oklch(75% 0.1 20 / 0.1)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>{error}</div>}

      <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
        {loading ? (
          <div className="skeleton" style={{ height: 96 }} />
        ) : visibles.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
            <span className="empty-state-icon">🏢</span>
            <p style={{ margin: 0 }}>{empresas.length === 0 ? 'Aún no hay empresas registradas.' : 'Ninguna empresa coincide con la búsqueda.'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Razón social</th>
                  <th>RUT</th>
                  <th>Contacto</th>
                  <th>Establecimientos</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((e) => {
                  const ee = e.establecimientos ?? [];
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.razon_social}</td>
                      <td>{e.rut ?? <span style={{ color: 'var(--color-text-subtle)' }}>—</span>}</td>
                      <td style={{ fontSize: 'var(--text-sm)', lineHeight: 1.4 }}>
                        {[e.contacto, e.telefono, e.email].filter(Boolean).map((v, i) => <div key={i}>{v}</div>)}
                        {!e.contacto && !e.telefono && !e.email && <span style={{ color: 'var(--color-text-subtle)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: 'var(--text-sm)', lineHeight: 1.4 }}>
                        {ee.length === 0 ? <span style={{ color: 'var(--color-text-subtle)' }}>Ninguno</span> : (
                          <>
                            {ee.slice(0, 3).map((x) => (
                              <div key={x.id}><Link href={`/establecimientos/${x.id}`} style={{ color: 'var(--color-primary)' }}>{x.nombre}</Link></div>
                            ))}
                            {ee.length > 3 && <div style={sub}>+{ee.length - 3} más</div>}
                          </>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <AccionesFila
                          etiqueta={e.razon_social}
                          onEditar={() => { setEditando(e); setFormOpen(true); }}
                          onEliminar={() => setEliminando(e)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EmpresaFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        empresa={editando}
        onSaved={() => { setAviso(editando ? 'Empresa actualizada.' : 'Empresa creada.'); load(); }}
      />
      <ConfirmarEliminarModal
        open={eliminando !== null}
        onClose={() => setEliminando(null)}
        tipo="empresa"
        nombre={eliminando?.razon_social ?? ''}
        onConfirm={async () => {
          if (!eliminando) return;
          await empresasApi.remove(eliminando.id);
          setAviso('Empresa eliminada.');
          load();
        }}
      />
    </section>
  );
}
