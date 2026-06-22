'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { establecimientosApi, localesApi, expedientesApi, Establecimiento, Local, Expediente } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ESTADO_GENERAL } from '@/lib/constants';

export default function EstablecimientoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [ee, setEe] = useState<Establecimiento | null>(null);
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Local Modal state
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const [newLocal, setNewLocal] = useState({
    numero_local: 1,
    nombre: '',
    direccion: '',
    usa_gas: true,
  });
  const [addingLocal, setAddingLocal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Start Expediente Modal state
  const [expedienteModalOpen, setExpedienteModalOpen] = useState(false);
  const [newExpediente, setNewExpediente] = useState({
    empresa_instaladora: '',
    rut_empresa: '',
  });
  const [startingExpediente, setStartingExpediente] = useState(false);
  const [expedienteError, setExpedienteError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    establecimientosApi.get(id)
      .then(data => {
        setEe(data);
        setLocales(data.locales ?? []);
        setError(null);

        // Pre-fill next local number
        const nextNum = (data.locales ?? []).reduce((max, l) => l.numero_local > max ? l.numero_local : max, 0) + 1;
        setNewLocal(prev => ({ ...prev, numero_local: nextNum }));
      })
      .catch(err => {
        setError(err.message || 'Error al cargar los detalles del establecimiento');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handleAddLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocal.nombre.trim() || !newLocal.direccion.trim()) {
      setLocalError('Todos los campos son obligatorios');
      return;
    }

    setAddingLocal(true);
    setLocalError(null);
    try {
      const created = await localesApi.create(id, newLocal);
      setLocales(prev => [...prev, created]);
      setLocalModalOpen(false);
      setNewLocal(prev => ({
        numero_local: prev.numero_local + 1,
        nombre: '',
        direccion: '',
        usa_gas: true,
      }));
    } catch (err: any) {
      setLocalError(err.message || 'Error al crear local');
    } finally {
      setAddingLocal(false);
    }
  };

  const handleStartExpediente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpediente.empresa_instaladora.trim() || !newExpediente.rut_empresa.trim()) {
      setExpedienteError('Todos los campos son obligatorios');
      return;
    }

    setStartingExpediente(true);
    setExpedienteError(null);
    try {
      const created = await expedientesApi.create({
        establecimiento_id: Number(id),
        empresa_instaladora: newExpediente.empresa_instaladora,
        rut_empresa: newExpediente.rut_empresa,
      });
      router.push(`/expedientes/${created.id}`);
    } catch (err: any) {
      setExpedienteError(err.message || 'Error al iniciar expediente');
    } finally {
      setStartingExpediente(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="skeleton" style={{ height: '48px', width: '200px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-6)' }}>
          <div className="skeleton" style={{ height: '300px' }} />
          <div className="skeleton" style={{ height: '500px' }} />
        </div>
      </div>
    );
  }

  if (error || !ee) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <Button onClick={() => router.push('/establecimientos')} variant="secondary" style={{ marginBottom: 'var(--space-4)' }}>
          ← Volver a listado
        </Button>
        <div style={{ color: 'var(--color-rojo)', background: 'oklch(75% 0.1 20 / 0.1)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          {error || 'Establecimiento no encontrado'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Button onClick={() => router.push('/establecimientos')} variant="ghost" size="sm" style={{ paddingLeft: 0, marginBottom: 'var(--space-2)' }}>
            ← Volver a Establecimientos
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)', margin: 0 }}>
              {ee.nombre}
            </h1>
            <Badge estado={ee.estado_general} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Left column: General Information & active expediente */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* General info card */}
          <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Ficha del Establecimiento
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>RBD</span>
                <strong style={{ fontFamily: 'Satoshi, sans-serif' }}>{ee.rbd}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Dirección</span>
                <strong>{ee.direccion}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Representante / Propietario</span>
                <strong>{ee.propietario}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Cantidad de Locales</span>
                <strong>{locales.length}</strong>
              </div>
            </div>
          </div>

          {/* Expediente status card */}
          <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Expediente Activo
            </h2>
            {ee.expediente_activo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--text-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Contratista:</span>
                    <strong>{ee.expediente_activo.empresa_instaladora}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Estado Proyecto:</span>
                    <Badge estado={ee.expediente_activo.estado_general} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Etapa TC6:</span>
                    <Badge estado={ee.expediente_activo.estado_tc6} />
                  </div>
                </div>
                <Button as="a" href={`/expedientes/${ee.expediente_activo.id}`} style={{ textAlign: 'center' }}>
                  Ver Progreso del Expediente
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', alignItems: 'center', textAlign: 'center', padding: 'var(--space-4) 0' }}>
                <span style={{ fontSize: 'var(--space-8)' }}>📂</span>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
                  Este establecimiento no tiene un expediente de regularización activo en este momento.
                </p>
                <Button onClick={() => setExpedienteModalOpen(true)} size="sm" style={{ marginTop: 'var(--space-2)' }}>
                  Iniciar Licitación / Expediente
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Locales list */}
        <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', margin: 0 }}>
              Locales y Anexos
            </h2>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button onClick={() => setLocalModalOpen(true)} variant="secondary" size="sm">
                + Agregar Local
              </Button>
              <Button
                as="a"
                href={locales.length === 0 ? '#' : `/establecimientos/${ee.id}/anexo2`}
                variant="primary"
                size="sm"
                style={locales.length === 0 ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
              >
                Digitalizar Anexo 2
              </Button>
            </div>
          </div>

          {locales.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-12) 0' }}>
              <span className="empty-state-icon">🏢</span>
              <p style={{ margin: 0 }}>No hay locales registrados en este establecimiento.</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                Debe registrar al menos un local para realizar el levantamiento técnico (Anexo 2).
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nº Local</th>
                    <th>Nombre Local</th>
                    <th>Dirección Local</th>
                    <th>Usa Gas</th>
                    <th style={{ textAlign: 'right' }}>Instalaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {locales.map(local => (
                    <tr key={local.id}>
                      <td style={{ fontWeight: 600 }}>{local.numero_local}</td>
                      <td style={{ fontWeight: 600 }}>{local.nombre}</td>
                      <td>{local.direccion}</td>
                      <td>{local.usa_gas ? '🟢 Sí' : '❌ No'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {local.usa_gas ? `${local.instalaciones?.length ?? 0} registradas` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Local Modal */}
      <Modal open={localModalOpen} onClose={() => setLocalModalOpen(false)} title="Agregar Local">
        <form onSubmit={handleAddLocal} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {localError && (
            <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>
              ⚠️ {localError}
            </div>
          )}
          <Input
            label="Número Correlativo"
            type="number"
            value={newLocal.numero_local}
            onChange={e => setNewLocal(prev => ({ ...prev, numero_local: Number(e.target.value) }))}
            required
          />
          <Input
            label="Nombre del Local"
            placeholder="Ej: Casino Principal, Pabellón A, etc."
            value={newLocal.nombre}
            onChange={e => setNewLocal(prev => ({ ...prev, nombre: e.target.value }))}
            required
          />
          <Input
            label="Dirección / Ubicación dentro del recinto"
            placeholder="Ej: Patio trasero, Edificio Norte Piso 1"
            value={newLocal.direccion}
            onChange={e => setNewLocal(prev => ({ ...prev, direccion: e.target.value }))}
            required
          />
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            <label className="label" style={{ margin: 0 }}>¿Usa gas?</label>
            <input
              type="checkbox"
              checked={newLocal.usa_gas}
              onChange={e => setNewLocal(prev => ({ ...prev, usa_gas: e.target.checked }))}
              style={{
                width: 20,
                height: 20,
                accentColor: 'var(--color-primary)',
                cursor: 'pointer',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button type="button" variant="secondary" onClick={() => setLocalModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={addingLocal}>
              Agregar Local
            </Button>
          </div>
        </form>
      </Modal>

      {/* Start Expediente Modal */}
      <Modal open={expedienteModalOpen} onClose={() => setExpedienteModalOpen(false)} title="Iniciar Licitación / Expediente">
        <form onSubmit={handleStartExpediente} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {expedienteError && (
            <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>
              ⚠️ {expedienteError}
            </div>
          )}
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
            Inicie el seguimiento de regularización de gas. Registre la empresa contratista asignada a la licitación de este establecimiento.
          </p>
          <Input
            label="Empresa Instaladora / Contratista"
            placeholder="Ej: GasControl Limitada"
            value={newExpediente.empresa_instaladora}
            onChange={e => setNewExpediente(prev => ({ ...prev, empresa_instaladora: e.target.value }))}
            required
          />
          <Input
            label="RUT Empresa"
            placeholder="Ej: 76.543.210-K"
            value={newExpediente.rut_empresa}
            onChange={e => setNewExpediente(prev => ({ ...prev, rut_empresa: e.target.value }))}
            required
          />
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button type="button" variant="secondary" onClick={() => setExpedienteModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={startingExpediente}>
              Iniciar Expediente
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
