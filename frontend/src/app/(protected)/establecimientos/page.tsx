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
    comuna: '',
    region: 'Los Lagos',
    nombre_propietario: 'SLEP Llanquihue',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Establecimiento | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      setCreateError('RBD, Nombre y Dirección son obligatorios');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const created = await establecimientosApi.create(newEeData);
      setEstablecimientos(prev => [created, ...prev]);
      setModalOpen(false);
      setNewEeData({ rbd: '', nombre: '', direccion: '', comuna: '', region: 'Los Lagos', nombre_propietario: 'SLEP Llanquihue' });
    } catch (err: any) {
      setCreateError(err.message || 'Error al crear establecimiento');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await establecimientosApi.remove(deleteTarget.id);
      setEstablecimientos(prev => prev.filter(e => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Error al eliminar establecimiento');
    } finally {
      setDeleting(false);
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
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
                  {/* Botón eliminar — acción destructiva separada */}
                  <button
                    id={`delete-ee-${ee.id}`}
                    onClick={() => { setDeleteTarget(ee); setDeleteError(null); }}
                    style={{
                      background: 'none',
                      border: '1px solid oklch(60% 0.18 15 / 0.35)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-rojo)',
                      fontSize: 'var(--text-xs)',
                      padding: '6px 0',
                      cursor: 'pointer',
                      width: '100%',
                      fontFamily: 'Satoshi, sans-serif',
                      letterSpacing: '0.02em',
                      transition: 'background var(--transition-interactive)',
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = 'oklch(75% 0.1 20 / 0.08)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'none')}
                    aria-label={`Eliminar ${ee.nombre}`}
                  >
                    🗑 Eliminar establecimiento
                  </button>
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
            placeholder="Ej: Avenida Philippi 563"
            value={newEeData.direccion}
            onChange={e => setNewEeData(prev => ({ ...prev, direccion: e.target.value }))}
            required
          />
          <Input
            label="Comuna"
            placeholder="Ej: Frutillar"
            value={newEeData.comuna}
            onChange={e => setNewEeData(prev => ({ ...prev, comuna: e.target.value }))}
          />
          <Input
            label="Propietario / Representante"
            value={newEeData.nombre_propietario}
            onChange={e => setNewEeData(prev => ({ ...prev, nombre_propietario: e.target.value }))}
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

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        title="Eliminar Establecimiento"
        maxWidth="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-2) 0' }}>
          <div style={{
            background: 'oklch(75% 0.1 20 / 0.1)',
            border: '1px solid oklch(60% 0.18 15 / 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
          }}>
            <p style={{ margin: '0 0 var(--space-2) 0', fontWeight: 700, color: 'var(--color-rojo)', fontFamily: 'Satoshi, sans-serif' }}>
              ⚠️ Acción en cadena — sin posibilidad de recuperar
            </p>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              Eliminar <strong style={{ color: 'var(--color-text)' }}>{deleteTarget?.nombre}</strong> realizará las siguientes acciones:
            </p>
            <ul style={{ margin: 'var(--space-2) 0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
              <li>Marcar todas las <strong>alertas activas</strong> de sus expedientes como resueltas</li>
              <li>Archivar todos sus <strong>expedientes</strong> asociados</li>
              <li>Eliminar el establecimiento del listado activo</li>
            </ul>
            <p style={{ margin: 'var(--space-3) 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Los registros históricos (certificaciones, documentos) se conservan en la base de datos.
            </p>
          </div>

          {deleteError && (
            <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)', background: 'oklch(75% 0.1 20 / 0.08)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
              ⚠️ {deleteError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              id="confirm-delete-establecimiento"
              onClick={handleDeleteConfirm}
              loading={deleting}
              style={{ background: 'var(--color-rojo)', borderColor: 'var(--color-rojo)' }}
            >
              Sí, eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
