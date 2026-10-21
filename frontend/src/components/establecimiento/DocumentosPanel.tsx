'use client';

import React, { useEffect, useState } from 'react';
import { Pencil, Trash } from 'lucide-react';
import { documentosApi, getToken, Documento } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { CATEGORIAS_DOCUMENTO, formatDate, formatBytes } from '@/lib/constants';

interface Props {
  expedienteId: number;
  documentos: Documento[];
}

const CLAVES = CATEGORIAS_DOCUMENTO.map((c) => c.key as string);
/** Cualquier valor desconocido se muestra en "Otros documentos" */
const carpetaDe = (doc: Documento) => (CLAVES.includes(doc.categoria) ? doc.categoria : 'otros');

/** Documentos del expediente ordenados en carpetas por categoría (planos, actas, memorias, certificados SEC). */
export function DocumentosPanel({ expedienteId, documentos }: Props) {
  const [docs, setDocs] = useState<Documento[]>(documentos);
  const [abiertas, setAbiertas] = useState<Set<string>>(
    () => new Set(documentos.map(carpetaDe)),
  );
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => setDocs(documentos), [documentos]);

  const alternar = (clave: string) =>
    setAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave); else next.add(clave);
      return next;
    });

  const abrir = (clave: string) => setAbiertas((prev) => new Set(prev).add(clave));

  const subir = async (e: React.ChangeEvent<HTMLInputElement>, clave: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(clave);
    setError(null);
    try {
      const uploaded = await documentosApi.upload(expedienteId, file, clave);
      // Mismo nombre en la misma carpeta ⇒ el backend sobreescribe; si no, se agrega
      setDocs((prev) => {
        const idx = prev.findIndex((d) => d.id === uploaded.id);
        if (idx === -1) return [uploaded, ...prev];
        const next = [...prev];
        next[idx] = uploaded;
        return next;
      });
      abrir(clave);
    } catch (err: any) {
      setError(err.message || 'Error al subir documento');
    } finally {
      setSubiendo(null);
      e.target.value = '';
    }
  };

  const mover = async (doc: Documento, clave: string) => {
    if (!clave || clave === carpetaDe(doc)) return;
    setError(null);
    try {
      const updated = await documentosApi.setCategoria(doc.id, clave);
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
      abrir(clave);
    } catch (err: any) {
      setError(err.message || 'Error al mover el documento');
    }
  };

  const confirmarRenombre = async () => {
    if (!renamingId) return;
    setRenameLoading(true);
    try {
      const updated = await documentosApi.rename(renamingId, renameValue);
      setDocs((prev) => prev.map((d) => (d.id === renamingId ? updated : d)));
      setRenamingId(null);
    } catch (err: any) {
      setError(err.message || 'Error al renombrar');
    } finally {
      setRenameLoading(false);
    }
  };

  const eliminar = async (doc: Documento) => {
    if (!confirm(`¿Eliminar "${doc.nombre_original}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(doc.id);
    try {
      await documentosApi.delete(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  // El endpoint exige JWT: se descarga con fetch y se entrega como blob
  const descargar = async (doc: Documento) => {
    const token = getToken();
    try {
      const res = await fetch(documentosApi.downloadUrl(doc.id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const objectUrl = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = doc.nombre_original;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      setError(err.message || 'Error al descargar el archivo');
    }
  };

  return (
    <section className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', margin: 0 }}>
          Documentos ({docs.length})
        </h2>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Cada archivo va en la carpeta que le corresponde. Sube directamente en la carpeta o muévelo después.
        </span>
      </div>

      {error && <div style={{ color: 'var(--color-rojo)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-3)' }}>⚠️ {error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {CATEGORIAS_DOCUMENTO.map((cat) => {
          const enCarpeta = docs.filter((d) => carpetaDe(d) === cat.key);
          const abierta = abiertas.has(cat.key);
          const idCuerpo = `carpeta-${cat.key}`;
          return (
            <div key={cat.key} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-1) var(--space-3)', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => alternar(cat.key)}
                  aria-expanded={abierta}
                  aria-controls={idCuerpo}
                  style={{ flex: 1, minWidth: 180, minHeight: 44, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left', padding: 0 }}
                >
                  <span aria-hidden="true" style={{ width: 14, color: 'var(--color-text-muted)' }}>{abierta ? '▾' : '▸'}</span>
                  <span aria-hidden="true">📁</span>
                  <strong style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 'var(--text-sm)' }}>{cat.label}</strong>
                  <span className={`badge ${enCarpeta.length > 0 ? 'badge-primary' : 'badge-gris'}`}>{enCarpeta.length}</span>
                </button>
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                  {subiendo === cat.key ? 'Subiendo…' : '+ Subir aquí'}
                  <input
                    type="file"
                    onChange={(e) => subir(e, cat.key)}
                    disabled={subiendo !== null}
                    aria-label={`Subir archivo a ${cat.label}`}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {abierta && (
                <div id={idCuerpo} style={{ padding: '0 var(--space-3) var(--space-3)' }}>
                  {enCarpeta.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      Sin documentos en esta carpeta. {cat.hint}.
                    </p>
                  ) : (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Archivo</th>
                            <th>Fecha</th>
                            <th>Tamaño</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enCarpeta.map((doc) => (
                            <tr key={doc.id}>
                              <td style={{ fontWeight: 600, maxWidth: '240px' }}>
                                {renamingId === doc.id ? (
                                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                    <input
                                      autoFocus
                                      value={renameValue}
                                      onChange={(e) => setRenameValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') confirmarRenombre();
                                        if (e.key === 'Escape') setRenamingId(null);
                                      }}
                                      aria-label="Nuevo nombre del archivo"
                                      style={{ flex: 1, padding: 'var(--space-1) var(--space-2)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontSize: 'var(--text-sm)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                                    />
                                    <Button size="sm" onClick={confirmarRenombre} loading={renameLoading} aria-label="Confirmar nombre" style={{ padding: 'var(--space-1) var(--space-2)' }}>✓</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)} aria-label="Cancelar" style={{ padding: 'var(--space-1) var(--space-2)' }}>✕</Button>
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
                                <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <Button variant="ghost" size="sm" onClick={() => descargar(doc)} title="Descargar archivo">⬇️ Descargar</Button>
                                  <select
                                    value=""
                                    onChange={(e) => mover(doc, e.target.value)}
                                    aria-label={`Mover ${doc.nombre_original} a otra carpeta`}
                                    className="input-field"
                                    style={{ width: 'auto', minHeight: 36, padding: '0 var(--space-2)', fontSize: 'var(--text-xs)' }}
                                  >
                                    <option value="">Mover a…</option>
                                    {CATEGORIAS_DOCUMENTO.filter((c) => c.key !== cat.key).map((c) => (
                                      <option key={c.key} value={c.key}>{c.label}</option>
                                    ))}
                                  </select>
                                  <Button variant="ghost" size="sm" onClick={() => { setRenamingId(doc.id); setRenameValue(doc.nombre_original); }} title="Renombrar archivo" aria-label="Renombrar archivo"><Pencil size={16} aria-hidden="true" /></Button>
                                  <Button variant="ghost" size="sm" onClick={() => eliminar(doc)} loading={deletingId === doc.id} title="Eliminar archivo" aria-label="Eliminar archivo" style={{ color: 'var(--color-rojo)' }}><Trash size={16} aria-hidden="true" /></Button>
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
