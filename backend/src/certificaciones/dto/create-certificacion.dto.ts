import { IsEnum, IsOptional, IsString, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoSello, TipoDefecto } from '../../common/enums';

export class CreateCertificacionDto {
  /** Local específico que se certifica */
  @IsOptional()
  @IsNumber()
  local_id?: number;

  /** Instalación específica que se certifica */
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

  /** Defectos incluidos en la creación (requerido si tipo_sello es amarillo o rojo) */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDefectoDto)
  defectos?: CreateDefectoDto[];
}

export class CreateDefectoDto {
  @IsEnum(TipoDefecto)
  tipo_defecto: TipoDefecto;

  @IsOptional()
  @IsString()
  instalacion_afectada?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class BulkCreateDefectosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDefectoDto)
  defectos: CreateDefectoDto[];
}
