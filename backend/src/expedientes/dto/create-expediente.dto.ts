import { Transform } from 'class-transformer';
import { IsRut } from '../../common/validators/is-rut.decorator';
import { formatearRut } from '../../common/rut.util';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { EstadoTC6, EstadoGeneral } from '../../common/enums';

export class CreateExpedienteDto {
  @IsNumber()
  establecimiento_id: number;

  @IsOptional()
  @IsString()
  empresa_instaladora?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? formatearRut(value) || undefined : value))
  @IsRut()
  rut_empresa?: string;

  @IsOptional()
  @IsString()
  contacto_empresa?: string;

  @IsOptional()
  @IsString()
  telefono_empresa?: string;

  @IsOptional()
  @IsString()
  email_empresa?: string;

  @IsOptional()
  @IsEnum(EstadoTC6)
  estado_tc6?: EstadoTC6;

  @IsOptional()
  @IsEnum(EstadoGeneral)
  estado_general?: EstadoGeneral;

  @IsOptional()
  @IsNumber()
  monto_presupuesto?: number;

  @IsOptional()
  @IsNumber()
  monto_ejecutado?: number;

  @IsOptional()
  @IsString()
  numero_licitacion?: string;

  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString()
  fecha_fin_estimada?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateEstadoTC6Dto {
  @IsEnum(EstadoTC6)
  nuevo_estado: EstadoTC6;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
