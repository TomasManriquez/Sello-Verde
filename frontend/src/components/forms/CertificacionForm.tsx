'use client';

import React, { useState, useEffect, useRef } from 'react';
import { certificacionesApi, establecimientosApi, ApiError, Local, Instalacion } from '@/lib/api';
import { Input, DateInput, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Anexo3Form, Defecto } from './Anexo3Form';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { CertificadorPicker } from '@/components/registro/CertificadorPicker';
import { formatDate } from '@/lib/constants';

interface CertificacionFormProps {
  expedienteId: number | string;
  /** ID del establecimiento para cargar locales e instalaciones */
  establecimientoId: number | string;
  /** Instalación que llega preseleccionada (desde la ficha o el tablero) */
  instalacionInicial?: number;
  onComplete?: () => void;
}

type SelloTipo = 'verde' | 'amarillo' | 'rojo';

interface Step1Data {
  certificador_id:      number | null;
  fecha_inspeccion:     string;
  numero_certificado:   string;
  observaciones:        string;
}

export function CertificacionForm({ expedienteId, establecimientoId, instalacionInicial, onComplete }: CertificacionFormProps) {
  // Se consume una sola vez, cuando se cargan los locales
  const preseleccion = useRef<number | undefined>(instalacionInicial);
  const [step, setStep]             = useState(0);

  // Step 0: Local & Instalación
  const [locales, setLocales]         = useState<Local[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<number | ''>('');
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [selectedInstalacion, setSelectedInstalacion] = useState<number | ''>('');
  const [loadingLocales, setLoadingLocales] = useState(false);

  // Step 1: Inspector
  const [step1, setStep1] = useState<Step1Data>({
    certificador_id:      null,
    fecha_inspeccion:     '',
    numero_certificado:   '',
    observaciones:        '',
  });

  // Step 2: Sello
  const [sello, setSello] = useState<SelloTipo | null>(null);

  // Step 3: Defectos (Anexo 3)
  const [defectos, setDefectos] = useState<Defecto[]>([]);

  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load locales on mount
  useEffect(() => {
    if (!establecimientoId) return;
    setLoadingLocales(true);
    // La ficha trae cada instalación con su sello vigente (el listado de locales no)
    establecimientosApi.get(establecimientoId)
      .then(ee => {
        const data = ee.locales ?? [];
        setLocales(data);
        const inicial = preseleccion.current;
        const dueno = inicial ? data.find(l => l.instalaciones?.some(i => i.id === inicial)) : undefined;
        if (dueno) setSelectedLocal(dueno.id);
      })
      .catch(() => setLocales([]))
      .finally(() => setLoadingLocales(false));
  }, [establecimientoId]);

  // Load instalaciones when local changes (si hay una sola, queda seleccionada)
  useEffect(() => {
    if (!selectedLocal) {
      setInstalaciones([]);
      setSelectedInstalacion('');
      return;
    }
    const local = locales.find(l => l.id === selectedLocal);
    const insts = local?.instalaciones ?? [];
    setInstalaciones(insts);
    const inicial = preseleccion.current;
    if (inicial && insts.some(i => i.id === inicial)) {
      setSelectedInstalacion(inicial);
      preseleccion.current = undefined;
    } else {
      setSelectedInstalacion(insts.length === 1 ? insts[0].id : '');
    }
  }, [selectedLocal, locales]);

  // El sello es por instalación: sin instalación no se puede registrar la inspección
  const step0Valid = selectedLocal !== '' && selectedInstalacion !== '';
  const sealActual = instalaciones.find(i => i.id === selectedInstalacion)?.sello ?? null;

  const step1Valid =
    step1.certificador_id !== null &&
    step1.fecha_inspeccion.length > 0;

  const handleSubmit = async () => {
    if (!sello) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        ...step1,
        tipo_sello: sello,
        instalacion_id: selectedInstalacion,
      };

      if (sello !== 'verde') {
        const defectosActivos = defectos.filter(d => d.marcado);
        if (defectosActivos.length === 0) {
          setError('Debes marcar al menos un defecto para un sello amarillo o rojo.');
          setSaving(false);
          return;
        }
        payload.defectos = defectosActivos.map(d => ({
          tipo_defecto: d.id,
          instalacion_afectada: d.instalacion_afectada,
        }));
      }

      await certificacionesApi.create(expedienteId, payload);
      setShowSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Error al registrar la certificación');
    } finally {
      setSaving(false);
    }
  };

  const STEPS = [
    { num: 0, label: 'Instalación' },
    { num: 1, label: 'Inspector' },
    { num: 2, label: 'Sello' },
    { num: 3, label: 'Defectos' },
  ];
  const totalSteps = sello && sello !== 'verde' ? 4 : 3;

  const SELLO_OPTIONS: { tipo: SelloTipo; emoji: string; label: string; desc: string; }[] = [
    {
      tipo:  'verde',
      emoji: '🟢',
      label: 'Sello Verde',
      desc:  'Sin defectos. Instalación aprobada. Vigente por 2 años.',
    },
    {
      tipo:  'amarillo',
      emoji: '🟡',
      label: 'Sello Amarillo',
      desc:  'Con defectos. Sin riesgo inminente. Plazo de 90 días para regularizar.',
    },
    {
      tipo:  'rojo',
      emoji: '🔴',
      label: 'Sello Rojo',
      desc:  'Defectos críticos. Riesgo inminente. Plazo urgente de 90 días.',
    },
  ];

  return (
    <div>
      {/* Steps header */}
      <div className="form-steps-header" style={{ marginBottom: 'var(--space-8)' }}>
        {STEPS.slice(0, totalSteps).map(s => {
          const cls = step > s.num ? 'step-done' : step === s.num ? 'step-active' : '';
          return (
            <div key={s.num} className={`form-step-indicator ${cls}`}>
              <div className="form-step-num">
                {step > s.num ? '✓' : s.num + 1}
              </div>
              <span className="form-step-label">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Step 0: Local & Instalación */}
      {step === 0 && (
        <div className="surface p-6 animate-fade-up">
          <h2 className="section-title mb-2">¿Qué instalación se certifica?</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
            Selecciona el local y la instalación de gas que fue inspeccionada. El sello y su vencimiento se llevan por instalación.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Select
              label="Local"
              value={String(selectedLocal)}
              onChange={e => setSelectedLocal(e.target.value ? Number(e.target.value) : '')}
              options={[
                { value: '', label: loadingLocales ? 'Cargando locales...' : '— Seleccionar local —' },
                ...locales
                  .filter(l => l.usa_gas)
                  .map(l => ({ value: String(l.id), label: `Local ${l.numero_local} — ${l.nombre}` })),
              ]}
              required
            />
            {selectedLocal && instalaciones.length > 0 && (
              <Select
                label="Instalación de Gas"
                required
                value={String(selectedInstalacion)}
                onChange={e => setSelectedInstalacion(e.target.value ? Number(e.target.value) : '')}
                options={[
                  { value: '', label: '— Seleccionar instalación —' },
                  ...instalaciones.map(i => ({
                    value: String(i.id),
                    label: [
                      i.zona_abastecimiento,
                      i.referencia,
                      i.tipo_gas,
                      i.abastecimiento,
                      i.artefacto_cilindro,
                    ].filter(Boolean).join(' · ') || `Instalación #${i.id}`,
                  })),
                ]}
              />
            )}
            {selectedLocal && instalaciones.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                Este local no tiene instalaciones de gas registradas. Regístralas primero en el
                levantamiento (Anexo 2) del establecimiento.
              </p>
            )}
            {selectedInstalacion !== '' && (
              <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
                Sello actual de esta instalación:
                {sealActual && sealActual.tipo_sello ? (
                  <>
                    <Badge estado={sealActual.tipo_sello} />
                    <span>
                      inspección {formatDate(sealActual.fecha_inspeccion)} · {sealActual.tipo_sello === 'verde' ? 'vence' : 'plazo hasta'} {formatDate(sealActual.fecha_limite)}
                    </span>
                  </>
                ) : (
                  <span>sin inspección registrada</span>
                )}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
            <Button variant="primary" disabled={!step0Valid} onClick={() => setStep(1)}>
              Siguiente →
            </Button>
          </div>
        </div>
      )}

      {/* Step 1: Inspector data */}
      {step === 1 && (
        <div className="surface p-6 animate-fade-up">
          <h2 className="section-title mb-6">Datos de la inspección</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <CertificadorPicker
                label="Certificador que validó la instalación"
                value={step1.certificador_id}
                onChange={id => setStep1(p => ({ ...p, certificador_id: id }))}
                required
              />
            </div>
            <DateInput
              label="Fecha de Inspección"
              value={step1.fecha_inspeccion}
              onChange={e => setStep1(p => ({ ...p, fecha_inspeccion: e.target.value }))}
              required
            />
            <Input
              label="Nº Certificado"
              value={step1.numero_certificado}
              onChange={e => setStep1(p => ({ ...p, numero_certificado: e.target.value }))}
              placeholder="CERT-2025-XXX"
              required
            />
            <Input
              label="Observaciones (opcional)"
              value={step1.observaciones}
              onChange={e => setStep1(p => ({ ...p, observaciones: e.target.value }))}
              placeholder="Notas adicionales"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-6)' }}>
            <Button variant="ghost" onClick={() => setStep(0)}>← Volver</Button>
            <Button variant="primary" disabled={!step1Valid} onClick={() => setStep(2)}>
              Siguiente →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Sello selection */}
      {step === 2 && (
        <div className="animate-fade-up">
          <h2 className="section-title mb-6">Seleccionar Tipo de Sello</h2>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            {SELLO_OPTIONS.map(opt => (
              <button
                key={opt.tipo}
                className={`sello-card ${sello === opt.tipo ? `selected-${opt.tipo}` : ''}`}
                onClick={() => setSello(opt.tipo)}
                style={{ background: 'none', fontFamily: 'inherit', textAlign: 'center', border: undefined }}
              >
                <span className="sello-icon">{opt.emoji}</span>
                <strong style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 'var(--text-base)' }}>
                  {opt.label}
                </strong>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-8)' }}>
            <Button variant="ghost" onClick={() => setStep(1)}>← Volver</Button>
            {sello && sello !== 'verde' ? (
              <Button variant="primary" onClick={() => setStep(3)}>
                Siguiente → Defectos
              </Button>
            ) : sello === 'verde' ? (
              <Button variant="primary" loading={saving} onClick={handleSubmit}>
                Registrar Sello Verde ✓
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* Step 3: Anexo 3 / Defectos */}
      {step === 3 && (
        <div className="surface p-6 animate-fade-up">
          <Anexo3Form onChange={setDefectos} />

          {error && (
            <div className="inline-alert inline-alert-error mt-4">
              <span>⚠</span> <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-8)' }}>
            <Button variant="ghost" onClick={() => setStep(2)}>← Volver</Button>
            <Button
              variant="danger"
              loading={saving}
              onClick={handleSubmit}
            >
              Registrar Sello {sello === 'amarillo' ? 'Amarillo' : 'Rojo'} ⚠
            </Button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <Modal
        open={showSuccess}
        onClose={() => { setShowSuccess(false); onComplete?.(); }}
        title="Certificación Registrada"
      >
        <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>
            {sello === 'verde' ? '🟢' : sello === 'amarillo' ? '🟡' : '🔴'}
          </div>
          <h3 style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>
            Sello {sello === 'verde' ? 'Verde' : sello === 'amarillo' ? 'Amarillo' : 'Rojo'} registrado
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
            {sello === 'verde'
              ? 'El Sello Verde de esta instalación vale por 2 años; el vencimiento aparecerá en Vencimientos 90 días antes.'
              : 'Se inició el plazo normativo de 90 días para regularizar esta instalación. El vencimiento anterior queda reemplazado.'}
          </p>
          <Button variant="primary" onClick={() => { setShowSuccess(false); onComplete?.(); }}>
            Volver al Expediente
          </Button>
        </div>
      </Modal>
    </div>
  );
}
