import { capacidadDeMetodo, puede } from './capacidades';

describe('capacidades por rol', () => {
  it('viewer solo lee, editor escribe y admin además elimina', () => {
    expect(['read', 'write', 'delete'].map((c) => puede('viewer', c as any))).toEqual([true, false, false]);
    expect(['read', 'write', 'delete'].map((c) => puede('editor', c as any))).toEqual([true, true, false]);
    expect(['read', 'write', 'delete'].map((c) => puede('admin', c as any))).toEqual([true, true, true]);
  });

  it('un rol desconocido o ausente no puede nada', () => {
    expect(puede('none', 'read')).toBe(false);
    expect(puede(undefined, 'read')).toBe(false);
  });

  it('el método HTTP define la capacidad exigida', () => {
    expect(capacidadDeMetodo('GET')).toBe('read');
    expect(['POST', 'PUT', 'PATCH'].map(capacidadDeMetodo)).toEqual(['write', 'write', 'write']);
    expect(capacidadDeMetodo('DELETE')).toBe('delete');
  });
});
