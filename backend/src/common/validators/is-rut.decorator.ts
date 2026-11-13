import { registerDecorator, ValidationOptions } from 'class-validator';
import { tieneFormatoRut } from '../rut.util';

/**
 * Valida el FORMATO de un RUT (7-8 dígitos + dígito verificador, con o sin puntos/guion).
 * El dígito verificador no se exige: hay datos de prueba y RUT de extranjeros con DV inconsistente;
 * la interfaz avisa si no coincide.
 */
export function IsRut(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isRut',
      target: object.constructor,
      propertyName,
      options: { message: 'El RUT no tiene un formato válido (ej: 12.345.678-9)', ...options },
      validator: {
        validate: (value: unknown) => typeof value === 'string' && tieneFormatoRut(value),
      },
    });
  };
}
