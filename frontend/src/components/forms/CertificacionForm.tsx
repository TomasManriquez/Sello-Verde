'use client';

import React, { useState } from 'react';
import { certificacionesApi, ApiError } from '@/lib/api';
import { Input, DateInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Anexo3Form, Defecto } from './Anexo3Form';
import { Modal } from '@/components/ui/Modal';

interface CertificacionFormProps {
  expedienteId: number | string;
  onComplete?: () => void;
}

type SelloTipo = 'verde' | 'amarillo' | 'rojo';

interface Step1Data {
  inspector_nombre:     string;
  entidad_certificadora:string;
  rut_inspector:        string;
  fecha_inspeccion:     string;
}

export function CertificacionForm({ expedienteId, onComplete }: CertificacionFormProps) {
  const [step, setStep]             = useState(1);
  const [step1, setStep1]           = useState<Step1Data>({
    inspector_nombre:     '',
    entidad_certificadora:'',
    rut_inspector:        '',
    fecha_inspeccion:     '',
  });
  const [sello, setSello]           = useState<SelloTipo | null>(null);
  const [defectos, setDefectos]     = useState<Defecto[]>([]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // ── Step 1 validation ─────────────────────────────────────
  const step1Valid =
    step1.inspector_nombre.trim().length > 0 &&
    step1.entidad_certificadora.trim().length > 0 &&
    step1.rut_inspector.trim().length > 0 &&
    step1.fecha_inspeccion.length > 0;

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!sello) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        ...step1,
        tipo_sello: sello,
      };

      if (sello !== 'verde' && defectos.some(d => d.marcado)) {
        payload.defectos = defectos
          .filter(d => d.marcado)
          .map(d => ({ tipo: d.id, instalacion_afectada: d.instalacion_afectada }));
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
    { num: 1, label: 'Inspector' },
    { num: 2, label: 'Sello' },
    { num: 3, label: 'Anexo 3' },
  ];
  const totalSteps = sello && sello !== 'verde' ? 3 : 2;

  const SELLO_OPTIONS: { tipo: SelloTipo; emoji: string; label: string; desc: string; }[] = [
    {
      tipo:  'verde',
      emoji: '🟢',
      label: 'Sello Verde',
      desc:  'Sin defectos. Instalación aprobada. Alerta de vencimiento en 2 años.',
    },
    {
      tipo:  'amarillo',
      emoji: '🟡',
      label: 'Sello Amarillo',
      desc:  'Con defectos mayores/menores. Sin riesgo inminente. Plazo de 90 días.',
    },
    {
      tipo:  'rojo',
      emoji: '🔴',
      label: 'Sello Rojo',
      desc:  'Defectos críticos. Riesgo inminente. Plazo urgente de 90 días.',
    },
  ];

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Steps header */}
      <div className="form-steps-header" style={{ marginBottom: 'var(--space-8)' }}>
        {STEPS.slice(0, totalSteps).map(s => {
          const cls = step > s.num ? 'step-done' : step === s.num ? 'step-active' : '';
          return (
            <div key={s.num} className={`form-step-indicator ${cls}`}>
              <div className="form-step-num">
                {step > s.num ? '✓' : s.num}
              </div>
              <span className="form-step-label">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Step 1: Inspector data */}
      {step === 1 && (
        <div className="surface p-6 animate-fade-up">
          <h2 className="section-title mb-6">Datos del Inspector</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            <Input
              label="Nombre del Inspector"
              value={step1.inspector_nombre}
              onChange={e => setStep1(p => ({ ...p, inspector_nombre: e.target.value }))}
              placeholder="Nombre completo"
              required
            />
            <Input
              label="Entidad Certificadora"
              value={step1.entidad_certificadora}
              onChange={e => setStep1(p => ({ ...p, entidad_certificadora: e.target.value }))}
              placeholder="Nombre de la empresa"
              required
            />
            <Input
              label="RUT Inspector"
              value={step1.rut_inspector}
              onChange={e => setStep1(p => ({ ...p, rut_inspector: e.target.value }))}
              placeholder="12.345.678-9"
              required
            />
            <DateInput
              label="Fecha de Inspección"
              value={step1.fecha_inspeccion}
              onChange={e => setStep1(p => ({ ...p, fecha_inspeccion: e.target.value }))}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
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
                Siguiente → Anexo 3
              </Button>
            ) : sello === 'verde' ? (
              <Button variant="primary" loading={saving} onClick={handleSubmit}>
                Registrar Sello Verde ✓
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* Step 3: Anexo 3 */}
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
              ? 'Se ha generado una alerta de vencimiento automática para 2 años.'
              : 'Se ha iniciado el plazo normativo de 90 días para la regularización.'}
          </p>
          <Button variant="primary" onClick={() => { setShowSuccess(false); onComplete?.(); }}>
            Volver al Expediente
          </Button>
        </div>
      </Modal>
    </div>
  );
}
