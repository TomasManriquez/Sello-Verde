// Sin JWT_SECRET en producción el arranque falla: `||` tomaría una clave pública si la variable llega vacía.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET es obligatoria en producción');
}

export const JWT_SECRET = process.env.JWT_SECRET || 'sello-verde-dev-secret';
