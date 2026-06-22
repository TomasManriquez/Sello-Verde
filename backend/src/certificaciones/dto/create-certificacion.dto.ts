import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoSello, TipoDefecto } from '../../common/enums';

export class CreateCertificacionDto {
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
