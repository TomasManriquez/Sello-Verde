import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsRut } from '../../common/validators/is-rut.decorator';
import { formatearRut } from '../../common/rut.util';
import { textoOpcional, textoOVacio } from '../../common/transforms';

const rutAlCrear = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? formatearRut(value) || undefined : value;
const rutAlEditar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? formatearRut(value) || null : value;

export class CreateCertificadorDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsOptional()
  @Transform(rutAlCrear)
  @IsRut()
  rut?: string;

  @IsOptional()
  @Transform(textoOpcional)
  @IsString()
  entidad?: string;

  @IsOptional()
  @Transform(textoOpcional)
  @IsString()
  telefono?: string;

  @IsOptional()
  @Transform(textoOpcional)
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email?: string;
}

/** Edición: un texto vacío borra el valor (llega como null). */
export class UpdateCertificadorDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede quedar vacío' })
  nombre?: string;

  @IsOptional()
  @Transform(rutAlEditar)
  @IsRut()
  rut?: string | null;

  @IsOptional()
  @Transform(textoOVacio)
  @IsString()
  entidad?: string | null;

  @IsOptional()
  @Transform(textoOVacio)
  @IsString()
  telefono?: string | null;

  @IsOptional()
  @Transform(textoOVacio)
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email?: string | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
