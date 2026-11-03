'use client';

import React, { useEffect, useState } from 'react';
import { catalogoApi, establecimientosApi, expedientesApi, Establecimiento } from '@/lib/api';
import { EmpresaPicker } from '@/components/registro/EmpresaPicker';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EstablecimientoTable } from '@/components/tables/EstablecimientoTable';
import { ESTADO_GENERAL, ESTADO_GENERAL_OPCIONES } from '@/lib/constants';

const NUEVO_VACIO = {
  rbd: '',
  nombre: '',
  direccion: '',
  comuna: '',
  region: 'Los Lagos',
  nombre_propietario: 'SLEP Llanquihue',
};

export default function EstablecimientosPage() {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  // Alta
  const [modalOpen, setModalOpen] = useState(false);
  const [newEeData, setNewEeData] = useState(NUEVO_VACIO);
  const [rbdAviso, setRbdAviso] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Eliminación
  const [deleteTarget, setDeleteTarget] = useState<Establecimiento | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Selección y exportación
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Asignación de empresa en bloque
  const [asignarOpen, setAsignarOpen] = useState(false);
  const [empresaAsignar, setEmpresaAsignar] = useState<number | null>(null);
  const [asignando, setAsignando] = useState(false);
  const [asignarError, setAsignarError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // El tablero enlaza aquí con ?nuevo=1 para abrir directamente el formulario de alta
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('nuevo') === '1') setModalOpen(true);
  }, []);

  const loadData = () => {
    setLoading(true);
    establecimientosApi.list({
      search: search.trim() || undefined,
      estado_general: estadoFilter || undefined,
    })
      .then(data => {
        setEstablecimientos(data);
        // La selección solo conserva los que siguen en la lista
        setSeleccionados(prev => new Set(data.filter(e => prev.has(e.id)).map(e => e.id)));
        setError(null);
      })
      .catch(err => setError(err.message || 'Error al cargar establecimientos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(loadData, 300);
    return () => clearTimeout(t);
  }, [search, estadoFilter]);

  const autocompletarPorRbd = async () => {
    const rbd = newEeData.rbd.trim();
    if (!rbd) return;
    try {
      const c = await catalogoApi.buscarEstablecimiento(rbd);
      // Solo completa lo que está vacío: no pisa lo que la persona ya escribió
      setNewEeData(p => ({ ...p, nombre: p.nombre || c.nombre, direccion: p.direccion || c.direccion, comuna: p.comuna || c.comuna }));
      setRbdAviso(`Datos completados desde el listado del SLEP: ${c.nombre}`);
    } catch {
      setRbdAviso('Este RBD no está en el listado del SLEP: completa los datos a mano.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEeData.rbd.trim() || !newEeData.nombre.trim() || !newEeData.direccion.trim()) {
      setCreateError('RBD, Nombre y Dirección son obligatorios');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await establecimientosApi.create(newEeData);
      setModalOpen(false);
      setNewEeData(NUEVO_VACIO);
      setRbdAviso(null);
      loadData();
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
      setSeleccionados(prev => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Error al eliminar establecimiento');
    } finally {
      setDeleting(false);
    }
  };

  const toggle = (id: number) =>
    setSeleccionados(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const toggleTodos = (marcar: boolean) =>
    setSeleccionados(marcar ? new Set(establecimientos.map(e => e.id)) : new Set());

  const asignarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!empresaAsignar) {
      setAsignarError('Selecciona una empresa.');
      return;
    }
    setAsignando(true);
    setAsignarError(null);
    try {
      const r = await expedientesApi.asignarEmpresa(Array.from(seleccionados), empresaAsignar);
      setAsignarOpen(false);
      setAviso(
        `Empresa asignada: ${r.creados} gestión(es) iniciada(s) y ${r.actualizados} actualizada(s)` +
          (r.omitidos.length ? `; ${r.omitidos.length} omitido(s)` : '') + '.',
      );
      setSeleccionados(new Set());
      loadData();
    } catch (err: any) {
      setAsignarError(err.message || 'No se pudo asignar la empresa');
    } finally {
      setAsignando(false);
    }
  };

  const exportar = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await establecimientosApi.exportExcel(Array.from(seleccionados));
    } catch (err: any) {
      setExportError(err.message || 'No se pudo generar el Excel');
    } finally {
      setExporting(false);
    }
  };

  const estadoOptions = ESTADO_GENERAL_OPCIONES.map(value => ({ value, label: ESTADO_GENERAL[value] }));
  const hayFiltros = search !== '' || estadoFilter !== '';

  return (
    <div className="hub-grid" style={{ gridTemplateColumns: 'minmax(220px, 260px) 1fr' }}>

      {/* Filtros */}
      <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', position: 'sticky', top: 'var(--space-4)' }}>
        <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
          Filtros de búsqueda
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Buscar por nombre / RBD / comuna"
            placeholder="Ej: Bernardo Philippi"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Select
            label="Etapa o sello"
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value)}
            options={[{ value: '', label: 'Todas' }, ...estadoOptions]}
          />
          <Button variant="secondary" onClick={() => { setSearch(''); setEstadoFilter(''); }} disabled={!hayFiltros}>
            Limpiar filtros
          </Button>
        </div>
      </div>

      {/* Listado */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)', margin: 0 }}>
              Establecimientos educacionales
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
              Selecciona uno o más para exportar su información a Excel.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)}>+ Agregar establecimiento</Button>
        </div>

        {/* Barra de selección */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', minHeight: 44 }}>
          <span aria-live="polite" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {loading
              ? 'Cargando…'
              : seleccionados.size > 0
                ? `${seleccionados.size} de ${establecimientos.length} seleccionados`
                : `${establecimientos.length} ${establecimientos.length === 1 ? 'establecimiento' : 'establecimientos'}`}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setEmpresaAsignar(null); setAsignarError(null); setAsignarOpen(true); }}
            disabled={seleccionados.size === 0}
            title={seleccionados.size === 0 ? 'Selecciona al menos un establecimiento' : undefined}
          >
            🏢 Asignar empresa{seleccionados.size > 0 ? ` (${seleccionados.size})` : ''}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={exportar}
            loading={exporting}
            disabled={seleccionados.size === 0}
            title={seleccionados.size === 0 ? 'Selecciona al menos un establecimiento' : undefined}
          >
            ⬇️ Exportar a Excel{seleccionados.size > 0 ? ` (${seleccionados.size})` : ''}
          </Button>
          {seleccionados.size > 0 && (
            <button
              type="button"
              onClick={() => setSeleccionados(new Set())}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600, minHeight: 44 }}
            >
              Quitar selección
            </button>
          )}
        </div>

        {aviso && (
          <div role="status" style={{ color: 'var(--color-primary)', background: 'var(--color-primary-muted)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
            <span>✓ {aviso}</span>
            <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
          </div>
        )}

        {(error || exportError) && (
          <div style={{ color: 'var(--color-rojo)', background: 'oklch(75% 0.1 20 / 0.1)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
            {error || exportError}
          </div>
        )}

        <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          <EstablecimientoTable
            establecimientos={establecimientos}
            loading={loading}
            emptyMessage="No se encontraron establecimientos con los criterios seleccionados."
            seleccion={{ ids: seleccionados, onToggle: toggle, onToggleTodos: toggleTodos }}
            onEliminar={(ee) => { setDeleteTarget(ee); setDeleteError(null); }}
          />
        </div>
      </div>

      {/* Modal: asignar empresa a los seleccionados */}
      <Modal open={asignarOpen} onClose={() => setAsignarOpen(false)} title="Asignar empresa contratista">
        <form onSubmit={asignarEmpresa} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Se asignará la empresa a <strong style={{ color: 'var(--color-text)' }}>{seleccionados.size} {seleccionados.size === 1 ? 'establecimiento' : 'establecimientos'}</strong>.
            A los que aún no tienen la gestión iniciada se les abrirá con esta empresa; a los que ya la tienen se les cambiará la empresa.
          </p>
          {asignarError && <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>⚠️ {asignarError}</div>}
          <EmpresaPicker value={empresaAsignar} onChange={setEmpresaAsignar} required autoSeleccionar={false} />
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setAsignarOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={asignando}>Asignar empresa</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: crear */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo establecimiento">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-2) 0' }}>
          {createError && <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>⚠️ {createError}</div>}
          <Input label="RBD del establecimiento" placeholder="Ej: 7976-6" value={newEeData.rbd} onChange={e => { setNewEeData(p => ({ ...p, rbd: e.target.value })); setRbdAviso(null); }} onBlur={autocompletarPorRbd} helpText={rbdAviso ?? 'Al salir del campo se completan nombre, dirección y comuna.'} required />
          <Input label="Nombre del establecimiento" placeholder="Ej: Escuela Bernardo Philippi" value={newEeData.nombre} onChange={e => setNewEeData(p => ({ ...p, nombre: e.target.value }))} required />
          <Input label="Dirección" placeholder="Ej: Avenida Philippi 563" value={newEeData.direccion} onChange={e => setNewEeData(p => ({ ...p, direccion: e.target.value }))} required />
          <Input label="Comuna" placeholder="Ej: Frutillar" value={newEeData.comuna} onChange={e => setNewEeData(p => ({ ...p, comuna: e.target.value }))} />
          <Input label="Propietario / representante" value={newEeData.nombre_propietario} onChange={e => setNewEeData(p => ({ ...p, nombre_propietario: e.target.value }))} required />
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={creating}>Crear establecimiento</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: confirmar eliminación */}
      <Modal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteError(null); }} title="Eliminar establecimiento" maxWidth="480px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-2) 0' }}>
          <div style={{ background: 'oklch(75% 0.1 20 / 0.1)', border: '1px solid oklch(60% 0.18 15 / 0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
            <p style={{ margin: '0 0 var(--space-2) 0', fontWeight: 700, color: 'var(--color-rojo)', fontFamily: 'Satoshi, sans-serif' }}>
              ⚠️ Acción en cadena — sin posibilidad de recuperar
            </p>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              Eliminar <strong style={{ color: 'var(--color-text)' }}>{deleteTarget?.nombre}</strong> realizará las siguientes acciones:
            </p>
            <ul style={{ margin: 'var(--space-2) 0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
              <li>Eliminar lógicamente todos sus <strong>expedientes</strong> asociados</li>
              <li>Quitar sus instalaciones de los <strong>vencimientos</strong></li>
              <li>Retirar el establecimiento del listado activo</li>
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
            <Button variant="secondary" onClick={() => { setDeleteTarget(null); setDeleteError(null); }} disabled={deleting}>Cancelar</Button>
            <Button id="confirm-delete-establecimiento" onClick={handleDeleteConfirm} loading={deleting} style={{ background: 'var(--color-rojo)', borderColor: 'var(--color-rojo)' }}>
              Sí, eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
