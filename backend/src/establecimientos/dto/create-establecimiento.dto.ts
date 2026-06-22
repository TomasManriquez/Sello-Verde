import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsEmail,
} from 'class-validator';
import { EstadoGeneral } from '../../common/enums';

export class CreateEstablecimientoDto {
  @IsString()
  rbd: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  nombre_propietario?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  comuna?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsEnum(EstadoGeneral)
  estado_general?: EstadoGeneral;

  @IsOptional()
  @IsNumber()
  cantidad_locales?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
