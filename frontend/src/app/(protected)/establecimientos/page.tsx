'use client';

import React, { useEffect, useState } from 'react';
import { establecimientosApi, Establecimiento } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ESTADO_GENERAL } from '@/lib/constants';

export default function EstablecimientosPage() {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  // New EE Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newEeData, setNewEeData] = useState({
    rbd: '',
    nombre: '',
    direccion: '',
    propietario: 'SLEP Llanquihue',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    establecimientosApi.list({
      search: search.trim() || undefined,
      estado_general: estadoFilter || undefined,
    })
      .then(data => {
        setEstablecimientos(data);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Error al cargar establecimientos');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadData();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, estadoFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEeData.rbd.trim() || !newEeData.nombre.trim() || !newEeData.direccion.trim()) {
      setCreateError('Todos los campos son obligatorios');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const created = await establecimientosApi.create(newEeData);
      setEstablecimientos(prev => [created, ...prev]);
      setModalOpen(false);
      setNewEeData({ rbd: '', nombre: '', direccion: '', propietario: 'SLEP Llanquihue' });
    } catch (err: any) {
      setCreateError(err.message || 'Error al crear establecimiento');
    } finally {
      setCreating(false);
    }
  };

  const estadoOptions = Object.entries(ESTADO_GENERAL).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
      {/* Filters Sidebar */}
      <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', position: 'sticky', top: 'var(--space-4)' }}>
        <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
          Filtros de Búsqueda
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Buscar por Nombre / RBD"
            placeholder="Ej: Bernardo Philippi"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <Select
            label="Estado del Establecimiento"
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value)}
            options={[{ value: '', label: 'Todos los estados' }, ...estadoOptions]}
          />

          <Button variant="secondary" onClick={() => { setSearch(''); setEstadoFilter(''); }} style={{ marginTop: 'var(--space-2)' }}>
            Limpiar Filtros
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)' }}>
              Establecimientos Educacionales
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Listado general de establecimientos asociados al servicio.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            + Agregar Establecimiento
          </Button>
        </div>

        {error && (
          <div style={{ color: 'var(--color-rojo)', background: 'oklch(75% 0.1 20 / 0.1)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '140px', borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : establecimientos.length === 0 ? (
          <div className="empty-state surface" style={{ height: 200 }}>
            <span className="empty-state-icon">🏫</span>
            <p>No se encontraron establecimientos con los criterios seleccionados.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
            {establecimientos.map((ee, i) => (
              <div
                key={ee.id}
                className="surface animate-fade-up"
                style={{
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 'var(--space-4)',
                  animationDelay: `${i * 50}ms`,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'Satoshi, sans-serif', fontWeight: 700 }}>
                      RBD {ee.rbd}
                    </span>
                    <Badge estado={ee.estado_general} />
                  </div>
                  <h3 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 'var(--text-base)', lineHeight: 1.2, margin: '0 0 var(--space-1) 0' }}>
                    {ee.nombre}
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
                    📍 {ee.direccion}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                  <Button
                    as="a"
                    href={`/establecimientos/${ee.id}`}
                    variant="ghost"
                    size="sm"
                    style={{ flex: 1, textAlign: 'center' }}
                  >
                    Ver Ficha
                  </Button>
                  {ee.expediente_activo ? (
                    <Button
                      as="a"
                      href={`/expedientes/${ee.expediente_activo.id}`}
                      variant="secondary"
                      size="sm"
                      style={{ flex: 1, textAlign: 'center' }}
                    >
                      Expediente
                    </Button>
                  ) : (
                    <Button
                      as="a"
                      href={`/establecimientos/${ee.id}`}
                      variant="primary"
                      size="sm"
                      style={{ flex: 1, textAlign: 'center' }}
                    >
                      Iniciar Gestión
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Establecimiento">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-2) 0' }}>
          {createError && (
            <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>
              ⚠️ {createError}
            </div>
          )}
          <Input
            label="RBD del Establecimiento"
            placeholder="Ej: 7976-6"
            value={newEeData.rbd}
            onChange={e => setNewEeData(prev => ({ ...prev, rbd: e.target.value }))}
            required
          />
          <Input
            label="Nombre del Establecimiento"
            placeholder="Ej: Escuela Bernardo Philippi"
            value={newEeData.nombre}
            onChange={e => setNewEeData(prev => ({ ...prev, nombre: e.target.value }))}
            required
          />
          <Input
            label="Dirección"
            placeholder="Ej: Avenida Philippi 563, Frutillar"
            value={newEeData.direccion}
            onChange={e => setNewEeData(prev => ({ ...prev, direccion: e.target.value }))}
            required
          />
          <Input
            label="Propietario / Representante"
            value={newEeData.propietario}
            onChange={e => setNewEeData(prev => ({ ...prev, propietario: e.target.value }))}
            required
          />
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={creating}>
              Crear Establecimiento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
