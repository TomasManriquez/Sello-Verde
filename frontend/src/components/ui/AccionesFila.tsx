'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Ellipsis, Pencil, Trash } from 'lucide-react';
import { puede } from '@/lib/capacidades';

interface Props {
  /** Nombre del registro, para los textos accesibles ("Editar Instalgas Sur") */
  etiqueta: string;
  onEditar: () => void;
  onEliminar: () => void;
}

/**
 * Acciones de una fila: un botón de tres puntos que despliega hacia el costado, con animación,
 * los íconos de editar y eliminar. Se cierra al elegir una acción, al hacer clic fuera o con Escape.
 */
export function AccionesFila({ etiqueta, onEditar, onEliminar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const idGrupo = useId();

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    const teclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', teclado);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', teclado);
    };
  }, [abierto]);

  const elegir = (accion: () => void) => () => {
    setAbierto(false);
    accion();
  };

  const editar = puede('write');
  const eliminar = puede('delete');
  if (!editar && !eliminar) return null;

  return (
    <div ref={raiz} className={`acciones-fila${abierto ? ' abierto' : ''}`}>
      {/* Se despliega a la izquierda del botón de tres puntos */}
      <div
        id={idGrupo}
        className="acciones-fila-items"
        role="group"
        aria-label={`Acciones de ${etiqueta}`}
        aria-hidden={!abierto}
      >
        {editar && (
          <button
            type="button"
            className="acciones-icono"
            onClick={elegir(onEditar)}
            tabIndex={abierto ? 0 : -1}
            aria-label={`Editar ${etiqueta}`}
            title="Editar"
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
        )}
        {eliminar && (
          <button
            type="button"
            className="acciones-icono peligro"
            onClick={elegir(onEliminar)}
            tabIndex={abierto ? 0 : -1}
            aria-label={`Eliminar ${etiqueta}`}
            title="Eliminar"
          >
            <Trash size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <button
        type="button"
        className="acciones-icono"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={idGrupo}
        aria-label={`Más acciones de ${etiqueta}`}
        title="Más acciones"
      >
        <Ellipsis size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
