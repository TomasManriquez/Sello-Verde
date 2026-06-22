'use client';

import React from 'react';

// ── Text Input ───────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export function Input({ label, error, helpText, className = '', id, ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="form-group">
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`input-field ${error ? 'border-rojo' : ''} ${className}`}
        style={error ? { borderColor: 'var(--color-rojo)' } : undefined}
        {...rest}
      />
      {error    && <span className="form-error">{error}</span>}
      {helpText && !error && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {helpText}
        </span>
      )}
    </div>
  );
}

// ── Select ───────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className = '', id, ...rest }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="form-group">
      {label && (
        <label className="label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`input-field ${className}`}
        style={error ? { borderColor: 'var(--color-rojo)' } : undefined}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

// ── Date Input ───────────────────────────────────────────────
interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function DateInput({ label, error, className = '', id, ...rest }: DateInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="form-group">
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="date"
        className={`input-field ${className}`}
        style={error ? { borderColor: 'var(--color-rojo)' } : undefined}
        {...rest}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

// ── Textarea ─────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', id, ...rest }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="form-group">
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`input-field ${className}`}
        style={{
          minHeight: '100px',
          resize: 'vertical',
          ...(error ? { borderColor: 'var(--color-rojo)' } : {}),
        }}
        {...rest}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
