import { IsEnum, IsOptional, IsString, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoSello } from '../../common/enums';
import { CreateDefectoDto } from './create-certificacion.dto';

export class UpdateCertificacionDto {
  @IsOptional()
  @IsNumber()
  local_id?: number;

  @IsOptional()
  @IsNumber()
  instalacion_id?: number;

  @IsOptional()
  @IsEnum(TipoSello)
  tipo_sello?: TipoSello;

  @IsOptional()
  @IsString()
  nombre_inspector?: string;

  @IsOptional()
  @IsString()
  entidad_certificadora?: string;

  @IsOptional()
  @IsString()
  rut_inspector?: string;

  @IsOptional()
  @IsDateString()
  fecha_inspeccion?: string;

  @IsOptional()
  @IsString()
  numero_certificado?: string;

  @IsOptional()
  @IsString()
  url_certificado?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  /** Si se provee, reemplaza la lista completa de defectos de esta certificación */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDefectoDto)
  defectos?: CreateDefectoDto[];
}
