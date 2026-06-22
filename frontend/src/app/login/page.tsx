'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, setToken, ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login(email, password);
      console.info('el token:', res.access_token);
      setToken(res.access_token);
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401
          ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
          : err.message
        );
      } else {
        setError('Error de conexión. Verifica que el servidor esté activo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
      {/* Brand panel */}
      <div className="login-brand">
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo mark */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-8)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-lg)',
                background: 'oklch(100% 0 0 / 0.15)',
                border: '1px solid oklch(100% 0 0 / 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontFamily: 'Satoshi, sans-serif',
                fontWeight: 900,
                fontSize: '18px',
                backdropFilter: 'blur(8px)',
              }}
            >
              SV
            </div>
          </div>

          <h1
            style={{
              fontFamily: 'Satoshi, sans-serif',
              fontWeight: 900,
              fontSize: 'clamp(2.5rem, 4vw, 4rem)',
              color: '#fff',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              marginBottom: 'var(--space-4)',
            }}
          >
            Sello<br />Verde
          </h1>

          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'oklch(100% 0 0 / 0.7)',
              maxWidth: '320px',
              lineHeight: 1.6,
              marginBottom: 'var(--space-8)',
            }}
          >
            Sistema de Certificaciones SEC para establecimientos educacionales del SLEP.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            {[
              '🟢  Gestión del ciclo de vida completo',
              '⏱  Control de plazos críticos normativos',
              '📋  Repositorio digital de expedientes',
              '🔔  Alertas automáticas de vencimiento',
            ].map(item => (
              <div
                key={item}
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'oklch(100% 0 0 / 0.75)',
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="login-form-panel">
        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h2
              style={{
                fontFamily: 'Satoshi, sans-serif',
                fontSize: 'var(--text-xl)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                marginBottom: 'var(--space-2)',
              }}
            >
              Iniciar sesión
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Acceso exclusivo para encargados del proceso SLEP.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="label" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="encargado@slepllanquihue.cl"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="inline-alert inline-alert-error" role="alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading || !email || !password}
              style={{ marginTop: 'var(--space-2)' }}
            >
              {loading ? 'Iniciando sesión…' : 'Ingresar al sistema'}
            </button>
          </form>

          <p style={{
            marginTop: 'var(--space-8)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-subtle)',
            textAlign: 'center',
          }}>
            Resolución 29738 EXENTA — SEC Chile
          </p>
        </div>
      </div>
    </div>
  );
}
