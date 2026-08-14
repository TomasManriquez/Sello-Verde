'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { expedientesApi, documentosApi, certificacionesApi, alertasApi, Expediente, Documento, Certificacion, Alerta, ApiError, getToken, UpdateCertificacionPayload } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Stepper } from '@/components/ui/Stepper';
import { Input } from '@/components/ui/Input';
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

  // Edit Certificacion state
  const [editCert, setEditCert] = useState<Certificacion | null>(null);
  const [editCertForm, setEditCertForm] = useState<UpdateCertificacionPayload>({});
  const [savingCert, setSavingCert] = useState(false);
  const [editCertError, setEditCertError] = useState<string | null>(null);

  // Alerta actions state
  const [resolviendoAlertaId, setResolviendoAlertaId] = useState<number | null>(null);
  const [eliminandoAlertaId, setEliminandoAlertaId] = useState<number | null>(null);
  const [alertaActionError, setAlertaActionError] = useState<string | null>(null);
  const [deleteAlertTarget, setDeleteAlertTarget] = useState<Alerta | null>(null);

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

  // ── Editar Certificación ─────────────────────────────────────
  const openEditCert = (cert: Certificacion) => {
    setEditCert(cert);
    setEditCertError(null);
    setEditCertForm({
      nombre_inspector: cert.nombre_inspector ?? '',
      entidad_certificadora: cert.entidad_certificadora ?? '',
      rut_inspector: cert.rut_inspector ?? '',
      fecha_inspeccion: cert.fecha_inspeccion?.slice(0, 10) ?? '',
      numero_certificado: cert.numero_certificado ?? '',
      observaciones: cert.observaciones ?? '',
    });
  };

  const handleSaveCert = async () => {
    if (!editCert) return;
    setSavingCert(true);
    setEditCertError(null);
    try {
      const updated = await certificacionesApi.update(editCert.id, editCertForm);
      setCerts(prev => prev.map(c => c.id === editCert.id ? { ...c, ...updated } : c));
      setEditCert(null);
    } catch (err: any) {
      setEditCertError(err.message || 'Error al guardar');
    } finally {
      setSavingCert(false);
    }
  };

  // ── Acciones sobre Alertas ────────────────────────────────────
  const handleResolverAlerta = async (alertaId: number) => {
    setResolviendoAlertaId(alertaId);
    setAlertaActionError(null);
    try {
      await alertasApi.marcarResuelta(alertaId);
      setAlertas(prev => prev.map(a => a.id === alertaId ? { ...a, estado: 'resuelta' } : a));
    } catch (err: any) {
      setAlertaActionError(err.message || 'Error al resolver alerta');
    } finally {
      setResolviendoAlertaId(null);
    }
  };

  const handleEliminarAlerta = async () => {
    if (!deleteAlertTarget) return;
    setEliminandoAlertaId(deleteAlertTarget.id);
    setAlertaActionError(null);
    try {
      await alertasApi.remove(deleteAlertTarget.id);
      setAlertas(prev => prev.filter(a => a.id !== deleteAlertTarget.id));
      setDeleteAlertTarget(null);
    } catch (err: any) {
      setAlertaActionError(err.message || 'Error al eliminar alerta');
    } finally {
      setEliminandoAlertaId(null);
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
    <>
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
                  {certs.map((cert) => (
                    <div
                      key={cert.id}
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <strong>Inspector: {cert.nombre_inspector}</strong>
                          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>({cert.entidad_certificadora})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <Badge estado={cert.tipo_sello} />
                          <button
                            id={`edit-cert-${cert.id}`}
                            onClick={() => openEditCert(cert)}
                            title="Editar certificación"
                            style={{
                              background: 'none', border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)', padding: '4px 10px',
                              cursor: 'pointer', fontSize: 'var(--text-xs)',
                              color: 'var(--color-text-muted)', fontFamily: 'Satoshi, sans-serif',
                              transition: 'all var(--transition-interactive)',
                            }}
                            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                          >
                            ✏️ Editar
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-6)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        <span>📅 {formatDate(cert.fecha_inspeccion)}</span>
                        {cert.numero_certificado && <span>📄 {cert.numero_certificado}</span>}
                        {cert.defectos && cert.defectos.length > 0 && (
                          <span style={{ color: 'var(--color-rojo)' }}>⚠️ {cert.defectos.length} defecto(s)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alertas Tab */}
          {activeTab === 'alertas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {alertaActionError && (
                <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)', background: 'oklch(75% 0.1 20 / 0.08)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
                  ⚠️ {alertaActionError}
                </div>
              )}
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
                        border: `1px solid ${alerta.estado === 'resuelta' ? 'var(--color-border)' : alerta.dias_restantes < 30 ? 'oklch(60% 0.18 15 / 0.4)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: alerta.estado === 'resuelta' ? 0.65 : 1,
                        transition: 'opacity var(--transition-interactive)',
                      }}
                    >
                      <div>
                        <strong>{(alerta.tipo || alerta.tipo_alerta) === 'vencimiento_sello_verde' ? 'Sello Verde (2 años)' : 'Plazo Regularización (90 días)'}</strong>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          Vence: {formatDate(alerta.fecha_vencimiento)}
                          <span style={{ marginLeft: 'var(--space-2)', color: alerta.dias_restantes < 30 ? 'var(--color-rojo)' : 'inherit' }}>
                            ({alerta.dias_restantes < 0 ? `Vencida hace ${Math.abs(alerta.dias_restantes)}d` : `${alerta.dias_restantes} días restantes`})
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Badge estado={alerta.estado} />
                        {/* Resolver — disponible si está activa o notificada */}
                        {(alerta.estado === 'activa' || alerta.estado === 'notificada') && (
                          <button
                            id={`resolver-alerta-${alerta.id}`}
                            onClick={() => handleResolverAlerta(alerta.id)}
                            disabled={resolviendoAlertaId === alerta.id}
                            title="Marcar como resuelta"
                            style={{
                              background: 'none', border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)', padding: '4px 10px',
                              cursor: 'pointer', fontSize: 'var(--text-xs)',
                              color: 'var(--color-primary)', fontFamily: 'Satoshi, sans-serif',
                              opacity: resolviendoAlertaId === alerta.id ? 0.5 : 1,
                            }}
                          >
                            {resolviendoAlertaId === alerta.id ? '...' : '✓ Resolver'}
                          </button>
                        )}
                        {/* Eliminar — solo disponible si está resuelta */}
                        {alerta.estado === 'resuelta' && (
                          <button
                            id={`eliminar-alerta-${alerta.id}`}
                            onClick={() => { setDeleteAlertTarget(alerta); setAlertaActionError(null); }}
                            title="Eliminar alerta resuelta"
                            style={{
                              background: 'none', border: '1px solid oklch(60% 0.18 15 / 0.35)',
                              borderRadius: 'var(--radius-sm)', padding: '4px 10px',
                              cursor: 'pointer', fontSize: 'var(--text-xs)',
                              color: 'var(--color-rojo)', fontFamily: 'Satoshi, sans-serif',
                            }}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* ── Modal: Editar Certificación ─────────────────────── */}
      <Modal
        open={!!editCert}
        onClose={() => { setEditCert(null); setEditCertError(null); }}
        title="Editar Certificación"
        maxWidth="520px"
      >
        {editCert && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-2) 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Input
                label="Nombre Inspector"
                value={editCertForm.nombre_inspector ?? ''}
                onChange={e => setEditCertForm(p => ({ ...p, nombre_inspector: e.target.value }))}
              />
              <Input
                label="Entidad Certificadora"
                value={editCertForm.entidad_certificadora ?? ''}
                onChange={e => setEditCertForm(p => ({ ...p, entidad_certificadora: e.target.value }))}
              />
              <Input
                label="RUT Inspector"
                value={editCertForm.rut_inspector ?? ''}
                onChange={e => setEditCertForm(p => ({ ...p, rut_inspector: e.target.value }))}
              />
              <Input
                label="Fecha Inspección"
                type="date"
                value={editCertForm.fecha_inspeccion ?? ''}
                onChange={e => setEditCertForm(p => ({ ...p, fecha_inspeccion: e.target.value }))}
              />
              <Input
                label="N° Certificado"
                value={editCertForm.numero_certificado ?? ''}
                onChange={e => setEditCertForm(p => ({ ...p, numero_certificado: e.target.value }))}
              />
            </div>
            <Input
              label="Observaciones"
              value={editCertForm.observaciones ?? ''}
              onChange={e => setEditCertForm(p => ({ ...p, observaciones: e.target.value }))}
            />
            {editCertError && (
              <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>⚠️ {editCertError}</div>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => { setEditCert(null); setEditCertError(null); }} disabled={savingCert}>
                Cancelar
              </Button>
              <Button id="save-edit-cert" onClick={handleSaveCert} loading={savingCert}>
                Guardar cambios
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Confirmar Eliminar Alerta ─────────────────── */}
      <Modal
        open={!!deleteAlertTarget}
        onClose={() => { setDeleteAlertTarget(null); setAlertaActionError(null); }}
        title="Eliminar Alerta"
        maxWidth="420px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-2) 0' }}>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            ¿Confirmas eliminar esta alerta resuelta? El registro se conserva en la base de datos (soft delete).
          </p>
          {alertaActionError && (
            <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)' }}>⚠️ {alertaActionError}</div>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => { setDeleteAlertTarget(null); setAlertaActionError(null); }} disabled={!!eliminandoAlertaId}>
              Cancelar
            </Button>
            <Button
              id="confirm-delete-alerta"
              onClick={handleEliminarAlerta}
              loading={!!eliminandoAlertaId}
              style={{ background: 'var(--color-rojo)', borderColor: 'var(--color-rojo)' }}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
