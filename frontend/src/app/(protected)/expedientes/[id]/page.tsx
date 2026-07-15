'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { expedientesApi, documentosApi, certificacionesApi, alertasApi, Expediente, Documento, Certificacion, Alerta, ApiError, getToken } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Stepper } from '@/components/ui/Stepper';
import { TC6_ESTADOS, Tc6Estado, formatDate, formatBytes } from '@/lib/constants';

export default function ExpedienteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [exp, setExp] = useState<Expediente | null>(null);
  const [docs, setDocs] = useState<Documento[]>([]);
  const [certs, setCerts] = useState<Certificacion[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'documentos' | 'certificaciones' | 'alertas'>('documentos');

  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // TC6 State change loading
  const [advancingTc6, setAdvancingTc6] = useState(false);

  const loadData = () => {
    setLoading(true);
    expedientesApi.get(id)
      .then(data => {
        setExp(data);
        setDocs(data.documentos ?? []);
        setCerts(data.certificaciones ?? []);
        setAlertas(data.alertas ?? []);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Error al cargar el expediente');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await documentosApi.upload(id, file);
      // If same name → overwrite in list; otherwise prepend
      setDocs(prev => {
        const idx = prev.findIndex(d => d.nombre_original === uploaded.nombre_original);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = uploaded;
          return next;
        }
        return [uploaded, ...prev];
      });
    } catch (err: any) {
      setUploadError(err.message || 'Error al subir documento');
    } finally {
      setUploading(false);
      e.target.value = ''; // reset file input
    }
  };

  const handleRenameStart = (doc: Documento) => {
    setRenamingId(doc.id);
    setRenameValue(doc.nombre_original);
  };

  const handleRenameConfirm = async () => {
    if (!renamingId) return;
    setRenameLoading(true);
    try {
      const updated = await documentosApi.rename(renamingId, renameValue);
      setDocs(prev => prev.map(d => d.id === renamingId ? updated : d));
      setRenamingId(null);
    } catch (err: any) {
      alert(err.message || 'Error al renombrar');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm('¿Eliminar este documento? Esta acción no se puede deshacer.')) return;
    setDeletingId(docId);
    try {
      await documentosApi.delete(docId);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Downloads a document with authentication token injected.
   * The backend endpoint is JWT-protected, so we must pass the Bearer token.
   */
  const handleDownload = async (doc: Documento) => {
    const token = getToken();
    const url = documentosApi.downloadUrl(doc.id);
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = doc.nombre_original;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      alert(err.message || 'Error al descargar el archivo');
    }
  };

  const handleAdvanceTc6 = async (nextState: Tc6Estado) => {
    setAdvancingTc6(true);
    try {
      const updated = await expedientesApi.advanceTc6(id, nextState);
      setExp(updated);
    } catch (err: any) {
      alert(err.message || 'Error al avanzar estado TC6');
    } finally {
      setAdvancingTc6(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="skeleton" style={{ height: '48px', width: '200px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-6)' }}>
          <div className="skeleton" style={{ height: '400px' }} />
          <div className="skeleton" style={{ height: '500px' }} />
        </div>
      </div>
    );
  }

  if (error || !exp) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <Button onClick={() => router.push('/expedientes')} variant="secondary" style={{ marginBottom: 'var(--space-4)' }}>
          ← Volver a expedientes
        </Button>
        <div style={{ color: 'var(--color-rojo)', background: 'oklch(75% 0.1 20 / 0.1)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          {error || 'Expediente no encontrado'}
        </div>
      </div>
    );
  }

  // Get next step logic
  const currentStepIdx = TC6_ESTADOS.findIndex(s => s.key === exp.estado_tc6);
  const nextSteps: Tc6Estado[] = [];
  if (exp.estado_tc6 === 'sin_iniciar') nextSteps.push('en_elaboracion');
  else if (exp.estado_tc6 === 'en_elaboracion') nextSteps.push('ingresado_sec');
  else if (exp.estado_tc6 === 'ingresado_sec') {
    nextSteps.push('observado');
    nextSteps.push('tc6_aprobado');
  } else if (exp.estado_tc6 === 'observado') {
    nextSteps.push('tc6_aprobado');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div>
        <Button onClick={() => router.push('/expedientes')} variant="ghost" size="sm" style={{ paddingLeft: 0, marginBottom: 'var(--space-2)' }}>
          ← Volver a Expedientes
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 'var(--text-xl)', margin: 0 }}>
              Expediente: {exp.establecimiento?.nombre}
            </h1>
            <Badge estado={exp.estado_general} />
          </div>
          <Button as="a" href={`/expedientes/${exp.id}/certificacion`}>
            Registrar Certificación
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Left column: Expediente details and TC6 stepper */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Info Card */}
          <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Detalles del Expediente
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>RBD Establecimiento</span>
                <strong>{exp.establecimiento?.rbd}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Empresa Contratista</span>
                <strong>{exp.empresa_instaladora}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>RUT Contratista</span>
                <strong>{exp.rut_empresa}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Última Acción</span>
                <strong>{exp.ultima_accion || 'Creación de expediente'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Fecha de Creación</span>
                <strong>{formatDate(exp.created_at)}</strong>
              </div>
            </div>
          </div>

          {/* Stepper Card */}
          <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Progreso del Trámite TC6
            </h2>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Stepper current={exp.estado_tc6} />
            </div>

            {nextSteps.length > 0 && (
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>
                  Avanzar de Etapa (Acción Requerida)
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {nextSteps.map(stepKey => {
                    const label = TC6_ESTADOS.find(s => s.key === stepKey)?.label ?? stepKey;
                    const isDanger = stepKey === 'observado';
                    return (
                      <Button
                        key={stepKey}
                        onClick={() => handleAdvanceTc6(stepKey)}
                        variant={isDanger ? 'danger' : 'primary'}
                        size="sm"
                        loading={advancingTc6}
                        style={{ flex: 1 }}
                      >
                        {isDanger ? '❌ ' : '✓ '} {label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Tabs & Lists */}
        <div className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', minHeight: '400px' }}>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-4)', gap: 'var(--space-2)' }}>
            <button
              onClick={() => setActiveTab('documentos')}
              className={`tab-btn ${activeTab === 'documentos' ? 'active' : ''}`}
              style={{
                background: 'none',
                border: 'none',
                padding: 'var(--space-3) var(--space-4)',
                fontFamily: 'Satoshi, sans-serif',
                fontWeight: 700,
                fontSize: 'var(--text-sm)',
                borderBottom: activeTab === 'documentos' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === 'documentos' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              Documentos ({docs.length})
            </button>
            <button
              onClick={() => setActiveTab('certificaciones')}
              className={`tab-btn ${activeTab === 'certificaciones' ? 'active' : ''}`}
              style={{
                background: 'none',
                border: 'none',
                padding: 'var(--space-3) var(--space-4)',
                fontFamily: 'Satoshi, sans-serif',
                fontWeight: 700,
                fontSize: 'var(--text-sm)',
                borderBottom: activeTab === 'certificaciones' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === 'certificaciones' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              Certificaciones ({certs.length})
            </button>
            <button
              onClick={() => setActiveTab('alertas')}
              className={`tab-btn ${activeTab === 'alertas' ? 'active' : ''}`}
              style={{
                background: 'none',
                border: 'none',
                padding: 'var(--space-3) var(--space-4)',
                fontFamily: 'Satoshi, sans-serif',
                fontWeight: 700,
                fontSize: 'var(--text-sm)',
                borderBottom: activeTab === 'alertas' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === 'alertas' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              Alertas ({alertas.length})
            </button>
          </div>

          {/* Documentos Tab */}
          {activeTab === 'documentos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* File upload header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  Planos de diseño, actas de reparaciones, memorias técnicas o certificados SEC.
                </span>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {uploading ? 'Subiendo…' : '📁 Subir Archivo'}
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {uploadError && (
                <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>
                  ⚠️ {uploadError}
                </div>
              )}

              {docs.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
                  <span className="empty-state-icon">📄</span>
                  <p style={{ margin: 0 }}>No hay documentos en este expediente.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre del archivo</th>
                        <th>Fecha Subida</th>
                        <th>Tamaño</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map(doc => (
                        <tr key={doc.id}>
                          <td style={{ fontWeight: 600, maxWidth: '220px' }}>
                            {renamingId === doc.id ? (
                              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                <input
                                  autoFocus
                                  value={renameValue}
                                  onChange={e => setRenameValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleRenameConfirm();
                                    if (e.key === 'Escape') setRenamingId(null);
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: 'var(--space-1) var(--space-2)',
                                    border: '1px solid var(--color-primary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontFamily: 'inherit',
                                    fontSize: 'var(--text-sm)',
                                    background: 'var(--color-bg)',
                                    color: 'var(--color-text)',
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={handleRenameConfirm}
                                  loading={renameLoading}
                                  style={{ padding: 'var(--space-1) var(--space-2)' }}
                                >
                                  ✓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setRenamingId(null)}
                                  style={{ padding: 'var(--space-1) var(--space-2)' }}
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <span title={doc.nombre_original} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {doc.nombre_original}
                              </span>
                            )}
                          </td>
                          <td>{formatDate(doc.created_at)}</td>
                          <td>{formatBytes(doc.tamano_bytes)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(doc)}
                                title="Descargar archivo"
                              >
                                ⬇️ Descargar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRenameStart(doc)}
                                title="Renombrar archivo"
                                style={{ color: 'var(--color-text-muted)' }}
                              >
                                ✏️
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(doc.id)}
                                loading={deletingId === doc.id}
                                title="Eliminar archivo"
                                style={{ color: 'var(--color-rojo)' }}
                              >
                                🗑️
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Certificaciones Tab */}
          {activeTab === 'certificaciones' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {certs.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
                  <span className="empty-state-icon">📋</span>
                  <p style={{ margin: 0 }}>No hay inspecciones registradas en este expediente.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {certs.map((cert, idx) => (
                    <div
                      key={cert.id}
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <strong>Inspector: {cert.nombre_inspector}</strong> 
                          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                            ({cert.entidad_certificadora})
                          </span>
                        </div>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          Fecha Inspección: {formatDate(cert.fecha_inspeccion)}
                        </span>
                      </div>
                      <Badge estado={cert.tipo_sello} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alertas Tab */}
          {activeTab === 'alertas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {alertas.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
                  <span className="empty-state-icon">🔔</span>
                  <p style={{ margin: 0 }}>No hay alertas asociadas a este expediente.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {alertas.map(alerta => (
                    <div
                      key={alerta.id}
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{alerta.tipo_alerta === 'vencimiento_sello_verde' ? 'Sello Verde (2 años)' : 'Plazo Regularización (90 días)'}</strong>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          Vence: {formatDate(alerta.fecha_vencimiento)}
                          <span style={{ marginLeft: 'var(--space-2)', color: alerta.dias_restantes < 30 ? 'var(--color-rojo)' : 'inherit' }}>
                            ({alerta.dias_restantes < 0 ? `Vencida hace ${Math.abs(alerta.dias_restantes)}d` : `${alerta.dias_restantes} días restantes`})
                          </span>
                        </div>
                      </div>
                      <Badge estado={alerta.estado} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
