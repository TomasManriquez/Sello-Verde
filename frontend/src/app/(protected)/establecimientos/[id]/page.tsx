'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { establecimientosApi, localesApi, expedientesApi, Establecimiento, Expediente, Local, Instalacion } from '@/lib/api';
import { instalacionLabel } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { EmpresaPicker } from '@/components/registro/EmpresaPicker';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { TIPO_GAS_OPTIONS, ABASTECIMIENTO_OPTIONS, ZONA_OPTIONS } from '@/lib/constants';
import { calcularProximoPaso } from '@/lib/proximoPaso';
import { EtapasProceso, BannerProximoPaso } from '@/components/establecimiento/EtapasProceso';
import { InstalacionesPanel } from '@/components/establecimiento/InstalacionesPanel';
import { ProyectoPanel } from '@/components/establecimiento/ProyectoPanel';
import { DocumentosPanel } from '@/components/establecimiento/DocumentosPanel';
import { HistorialPanel } from '@/components/establecimiento/HistorialPanel';
import { puede } from '@/lib/capacidades';

const h1: React.CSSProperties = { fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)', margin: 0 };
const cardTitle: React.CSSProperties = { fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' };
const errorBox: React.CSSProperties = { color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' };
const optionsOf = (list: readonly string[]) => list.map((v) => ({ value: v, label: v }));

/**
 * Ficha única del establecimiento: levantamiento (locales e instalaciones), proyecto TC6,
 * sellos y plazos por instalación, documentos e historial en una sola vista.
 */
export default function EstablecimientoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [ee, setEe] = useState<Establecimiento | null>(null);
  const [exp, setExp] = useState<Expediente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const advanceRef = useRef<((estado: string) => Promise<void>) | null>(null);

  // Modales
  const [localOpen, setLocalOpen] = useState(false);
  const [newLocal, setNewLocal] = useState({ numero_local: 1, nombre: '', direccion: '', usa_gas: true });
  const [instLocalId, setInstLocalId] = useState<number | null>(null);
  const [newInst, setNewInst] = useState({
    tipo_gas: TIPO_GAS_OPTIONS[0] as string,
    abastecimiento: ABASTECIMIENTO_OPTIONS[0] as string,
    zona_abastecimiento: ZONA_OPTIONS[0] as string,
    referencia: '',
    artefacto_cilindro: '',
  });
  const [gestionOpen, setGestionOpen] = useState(false);
  const [empresaGestion, setEmpresaGestion] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ nombre: '', direccion: '', comuna: '', nombre_propietario: '' });
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState<
    { tipo: 'local'; local: Local } | { tipo: 'instalacion'; inst: Instalacion; local: Local } | null
  >(null);

  const load = useCallback(async () => {
    try {
      const data = await establecimientosApi.get(id);
      setEe(data);
      setExp(data.expediente_activo ? await expedientesApi.get(data.expediente_activo.id) : null);
      setError(null);

      const siguiente = (data.locales ?? []).reduce((max, l) => (l.numero_local > max ? l.numero_local : max), 0) + 1;
      setNewLocal((p) => ({ ...p, numero_local: siguiente }));
      setEditData({
        nombre: data.nombre ?? '',
        direccion: data.direccion ?? '',
        comuna: data.comuna ?? '',
        nombre_propietario: data.nombre_propietario ?? data.propietario ?? '',
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar el establecimiento');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  /** Ejecuta una acción de modal: maneja loading y error, y recarga la ficha al terminar. */
  const run = async (fn: () => Promise<void>, close: () => void) => {
    setBusy(true);
    setModalError(null);
    try {
      await fn();
      close();
      await load();
    } catch (err: any) {
      setModalError(err.message || 'Ocurrió un error');
    } finally {
      setBusy(false);
    }
  };

  const abrir = (setter: (v: boolean) => void) => { setModalError(null); setter(true); };

  const handleAddLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocal.nombre.trim()) { setModalError('El nombre del local es obligatorio'); return; }
    run(async () => { await localesApi.create(id, newLocal); }, () => {
      setLocalOpen(false);
      setNewLocal((p) => ({ ...p, nombre: '', direccion: '', usa_gas: true }));
    });
  };

  const handleAddInstalacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (instLocalId === null) return;
    run(async () => {
      await localesApi.addInstalacion(instLocalId, {
        tipo_gas: newInst.tipo_gas,
        abastecimiento: newInst.abastecimiento,
        zona_abastecimiento: newInst.zona_abastecimiento,
        referencia: newInst.referencia || undefined,
        artefacto_cilindro: newInst.artefacto_cilindro || undefined,
      });
    }, () => {
      setInstLocalId(null);
      setNewInst((p) => ({ ...p, referencia: '', artefacto_cilindro: '' }));
    });
  };

  const handleIniciarGestion = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!empresaGestion) {
      setModalError('Selecciona la empresa contratista.');
      return;
    }
    run(async () => {
      await expedientesApi.create({ establecimiento_id: Number(id), empresa_id: empresaGestion });
    }, () => setGestionOpen(false));
  };

  const handleEliminar = () => {
    if (!aEliminar) return;
    run(async () => {
      if (aEliminar.tipo === 'local') await localesApi.remove(aEliminar.local.id);
      else await localesApi.deleteInstalacion(aEliminar.inst.id);
    }, () => setAEliminar(null));
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => { await establecimientosApi.update(id, editData); }, () => setEditOpen(false));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="skeleton" style={{ height: '48px', width: '240px' }} />
        <div className="skeleton" style={{ height: '64px' }} />
        <div className="hub-grid">
          <div className="skeleton" style={{ height: '320px' }} />
          <div className="skeleton" style={{ height: '480px' }} />
        </div>
      </div>
    );
  }

  if (error || !ee) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <Button onClick={() => router.push('/establecimientos')} variant="secondary" style={{ marginBottom: 'var(--space-4)' }}>
          ← Volver a establecimientos
        </Button>
        <div style={{ color: 'var(--color-rojo)', background: 'oklch(75% 0.1 20 / 0.1)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          {error || 'Establecimiento no encontrado'}
        </div>
      </div>
    );
  }

  const paso = calcularProximoPaso(ee);
  const accion = paso.accion;
  const hayInstalaciones = (ee.locales ?? []).some((l) => l.usa_gas && (l.instalaciones?.length ?? 0) > 0);
  const hrefInspeccion = exp
    ? `/expedientes/${exp.id}/certificacion${accion?.instalacionId ? `?instalacion=${accion.instalacionId}` : ''}`
    : '#';

  const ejecutarAccion = () => {
    if (!accion) return;
    switch (accion.kind) {
      case 'iniciar_gestion': abrir(setGestionOpen); break;
      case 'agregar_local': abrir(setLocalOpen); break;
      case 'agregar_instalacion': setModalError(null); setInstLocalId(accion.localId ?? null); break;
      case 'avanzar_tc6': if (accion.estadoTc6) advanceRef.current?.(accion.estadoTc6); break;
    }
  };

  const f = ee.resumen_sellos;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Encabezado: una sola acción primaria, la que corresponde al siguiente paso */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <Button onClick={() => router.push('/establecimientos')} variant="ghost" size="sm" style={{ paddingLeft: 0, marginBottom: 'var(--space-2)' }}>
            ← Volver a Establecimientos
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <h1 style={h1}>{ee.nombre}</h1>
            <Badge estado={ee.estado_general} />
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
            RBD {ee.rbd}{ee.comuna ? ` · ${ee.comuna}` : ''}
          </div>
        </div>
        {puede('write') && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => abrir(setEditOpen)}><Pencil size={16} aria-hidden="true" /> Editar</Button>
            {accion?.kind === 'inspeccion' ? (
              <Button as="a" href={hrefInspeccion}>{accion.label}</Button>
            ) : accion ? (
              <Button onClick={ejecutarAccion}>{accion.label}</Button>
            ) : exp && hayInstalaciones ? (
              <Button as="a" href={`/expedientes/${exp.id}/certificacion`}>Registrar inspección</Button>
            ) : null}
          </div>
        )}
      </div>

      <BannerProximoPaso paso={paso} />
      <EtapasProceso estadoGeneral={ee.estado_general} />

      <div className="hub-grid">
        {/* Columna izquierda: ficha y proyecto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <section className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={cardTitle}>Ficha del establecimiento</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
              {[
                ['RBD', ee.rbd],
                ['Dirección', ee.direccion],
                ['Comuna', ee.comuna],
                ['Representante / Propietario', ee.nombre_propietario ?? ee.propietario],
                ['Locales', String((ee.locales ?? []).length)],
              ].map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ) : null,
              )}
              {f && f.total_instalaciones > 0 && (
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Sellos de las instalaciones</span>
                  <strong>
                    {f.verdes} de {f.total_instalaciones} con Sello Verde
                    {f.amarillos + f.rojos > 0 ? ` · ${f.amarillos + f.rojos} con defectos` : ''}
                    {f.sin_inspeccion > 0 ? ` · ${f.sin_inspeccion} sin inspección` : ''}
                  </strong>
                </div>
              )}
            </div>
          </section>

          {exp && <ProyectoPanel expediente={exp} onChanged={load} advanceRef={advanceRef} />}
        </div>

        {/* Columna derecha: instalaciones, documentos e historial */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minWidth: 0 }}>
          <InstalacionesPanel
            ee={ee}
            expedienteId={exp?.id}
            onAddLocal={() => abrir(setLocalOpen)}
            onAddInstalacion={(localId) => { setModalError(null); setInstLocalId(localId); }}
            onEliminarLocal={(local) => { setModalError(null); setAEliminar({ tipo: 'local', local }); }}
            onEliminarInstalacion={(inst, local) => { setModalError(null); setAEliminar({ tipo: 'instalacion', inst, local }); }}
          />
          {exp && (
            <>
              <DocumentosPanel expedienteId={exp.id} documentos={exp.documentos ?? []} />
              <HistorialPanel certificaciones={exp.certificaciones ?? []} onChanged={load} />
            </>
          )}
        </div>
      </div>

      {/* Agregar local */}
      <Modal open={localOpen} onClose={() => setLocalOpen(false)} title="Agregar local">
        <form onSubmit={handleAddLocal} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {modalError && <div style={errorBox}>⚠️ {modalError}</div>}
          <Input label="Número correlativo" type="number" value={newLocal.numero_local} onChange={(e) => setNewLocal((p) => ({ ...p, numero_local: Number(e.target.value) }))} required />
          <Input label="Nombre del local" placeholder="Ej: Casino Principal, Pabellón A" value={newLocal.nombre} onChange={(e) => setNewLocal((p) => ({ ...p, nombre: e.target.value }))} required />
          <Input label="Dirección / ubicación dentro del recinto" placeholder="Ej: Patio trasero, Edificio Norte Piso 1" value={newLocal.direccion} onChange={(e) => setNewLocal((p) => ({ ...p, direccion: e.target.value }))} />
          <label style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
            <input type="checkbox" checked={newLocal.usa_gas} onChange={(e) => setNewLocal((p) => ({ ...p, usa_gas: e.target.checked }))} style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }} />
            Este local usa gas
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setLocalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={busy}>Agregar local</Button>
          </div>
        </form>
      </Modal>

      {/* Agregar instalación */}
      <Modal open={instLocalId !== null} onClose={() => setInstLocalId(null)} title="Agregar instalación de gas">
        <form onSubmit={handleAddInstalacion} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {modalError && <div style={errorBox}>⚠️ {modalError}</div>}
          <Select label="Tipo de gas" value={newInst.tipo_gas} onChange={(e) => setNewInst((p) => ({ ...p, tipo_gas: e.target.value }))} options={optionsOf(TIPO_GAS_OPTIONS)} />
          <Select label="Abastecimiento" value={newInst.abastecimiento} onChange={(e) => setNewInst((p) => ({ ...p, abastecimiento: e.target.value }))} options={optionsOf(ABASTECIMIENTO_OPTIONS)} />
          <Select label="Zona de abastecimiento" value={newInst.zona_abastecimiento} onChange={(e) => setNewInst((p) => ({ ...p, zona_abastecimiento: e.target.value }))} options={optionsOf(ZONA_OPTIONS)} />
          <Input label="Referencia" placeholder="Descripción para ubicar la instalación o los artefactos" value={newInst.referencia} onChange={(e) => setNewInst((p) => ({ ...p, referencia: e.target.value }))} />
          <Input label="Artefacto / cilindro" placeholder="Ej: cocina-calefón" value={newInst.artefacto_cilindro} onChange={(e) => setNewInst((p) => ({ ...p, artefacto_cilindro: e.target.value }))} />
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setInstLocalId(null)}>Cancelar</Button>
            <Button type="submit" loading={busy}>Agregar instalación</Button>
          </div>
        </form>
      </Modal>

      {/* Iniciar gestión */}
      <Modal open={gestionOpen} onClose={() => setGestionOpen(false)} title="Iniciar gestión">
        <form onSubmit={handleIniciarGestion} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {modalError && <div style={errorBox}>⚠️ {modalError}</div>}
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
            Registra la empresa contratista adjudicada en la licitación de este establecimiento.
          </p>
          <EmpresaPicker value={empresaGestion} onChange={setEmpresaGestion} required />
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setGestionOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={busy}>Iniciar gestión</Button>
          </div>
        </form>
      </Modal>

      {/* Eliminar local o instalación */}
      <Modal
        open={aEliminar !== null}
        onClose={() => setAEliminar(null)}
        title={aEliminar?.tipo === 'local' ? 'Eliminar local' : 'Eliminar instalación'}
        maxWidth="480px"
      >
        {aEliminar && (() => {
          const instalaciones = aEliminar.tipo === 'local' ? aEliminar.local.instalaciones ?? [] : [aEliminar.inst];
          const inspeccionadas = instalaciones.filter((i) => i.sello && i.sello.estado_sello !== 'sin_inspeccion').length;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ background: 'oklch(75% 0.1 20 / 0.1)', border: '1px solid oklch(60% 0.18 15 / 0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                {aEliminar.tipo === 'local' ? (
                  <p style={{ margin: 0 }}>
                    Se eliminará el <strong>Local {aEliminar.local.numero_local}{aEliminar.local.nombre ? ` — ${aEliminar.local.nombre}` : ''}</strong>
                    {instalaciones.length > 0
                      ? <> junto con sus <strong>{instalaciones.length} {instalaciones.length === 1 ? 'instalación' : 'instalaciones'}</strong>.</>
                      : '.'}
                  </p>
                ) : (
                  <p style={{ margin: 0 }}>
                    Se eliminará la instalación <strong>{instalacionLabel({ ...aEliminar.inst, local: aEliminar.local }) || `#${aEliminar.inst.id}`}</strong>.
                  </p>
                )}
                <ul style={{ margin: 'var(--space-2) 0 0 var(--space-4)', color: 'var(--color-text-muted)' }}>
                  <li>Dejan de contar en los vencimientos.</li>
                  <li>
                    Las inspecciones ya registradas se conservan en el historial
                    {inspeccionadas > 0 ? `, pero ${inspeccionadas === 1 ? 'la instalación inspeccionada dejará' : `las ${inspeccionadas} instalaciones inspeccionadas dejarán`} de contar para el sello del establecimiento` : ''}.
                  </li>
                </ul>
              </div>
              {modalError && <div style={errorBox}>⚠️ {modalError}</div>}
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setAEliminar(null)} disabled={busy}>Cancelar</Button>
                <Button variant="danger" onClick={handleEliminar} loading={busy}>Sí, eliminar</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Editar establecimiento */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar establecimiento">
        <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {modalError && <div style={errorBox}>⚠️ {modalError}</div>}
          <Input label="Nombre del establecimiento" value={editData.nombre} onChange={(e) => setEditData((p) => ({ ...p, nombre: e.target.value }))} required />
          <Input label="Dirección" value={editData.direccion} onChange={(e) => setEditData((p) => ({ ...p, direccion: e.target.value }))} required />
          <Input label="Comuna" value={editData.comuna} onChange={(e) => setEditData((p) => ({ ...p, comuna: e.target.value }))} />
          <Input label="Propietario / representante" value={editData.nombre_propietario} onChange={(e) => setEditData((p) => ({ ...p, nombre_propietario: e.target.value }))} required />
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={busy}>Guardar cambios</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
