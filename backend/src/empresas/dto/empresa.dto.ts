import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsRut } from '../../common/validators/is-rut.decorator';
import { formatearRut } from '../../common/rut.util';
import { textoOpcional, textoOVacio } from '../../common/transforms';

const rutAlCrear = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? formatearRut(value) || undefined : value;
const rutAlEditar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? formatearRut(value) || null : value;

export class CreateEmpresaDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria' })
  razon_social: string;

  @IsOptional()
  @Transform(rutAlCrear)
  @IsRut()
  rut?: string;

  @IsOptional()
  @Transform(textoOpcional)
  @IsString()
  contacto?: string;

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
export class UpdateEmpresaDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'La razón social no puede quedar vacía' })
  razon_social?: string;

  @IsOptional()
  @Transform(rutAlEditar)
  @IsRut()
  rut?: string | null;

  @IsOptional()
  @Transform(textoOVacio)
  @IsString()
  contacto?: string | null;

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
  activa?: boolean;
}

export class FusionDto {
  /** Registro que se conserva; el de la URL se fusiona en él y queda inactivo */
  @IsInt()
  destino_id: number;
}
