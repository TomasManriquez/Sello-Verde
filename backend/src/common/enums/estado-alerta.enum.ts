export enum EstadoAlerta {
  ACTIVA = 'activa',
  NOTIFICADA = 'notificada',
  RESUELTA = 'resuelta',
  VENCIDA = 'vencida',
}

/**
 * Alertas que siguen requiriendo acción del encargado (todas salvo `resuelta`).
 * El cron cambia el estado a `notificada`/`vencida`, pero eso no debe ocultar
 * la alerta de los contadores ni del tablero.
 */
export const ESTADOS_ALERTA_PENDIENTES = [
  EstadoAlerta.ACTIVA,
  EstadoAlerta.NOTIFICADA,
  EstadoAlerta.VENCIDA,
];
