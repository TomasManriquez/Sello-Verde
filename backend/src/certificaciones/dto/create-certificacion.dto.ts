import { IsEnum, IsOptional, IsString, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IsRut } from '../../common/validators/is-rut.decorator';
import { formatearRut } from '../../common/rut.util';
import { TipoSello, TipoDefecto } from '../../common/enums';

export class CreateCertificacionDto {
  /** Opcional y redundante: el local se deduce de la instalación */
  @IsOptional()
  @IsNumber()
  local_id?: number;

  /** Instalación que se inspecciona (obligatoria: el sello es por instalación) */
  @IsNumber({}, { message: 'Debes seleccionar la instalación que se inspeccionó' })
  instalacion_id: number;

  /** Certificador (entidad Certificador) que validó la instalación */
  @IsNumber({}, { message: 'Debes seleccionar el certificador que validó la instalación' })
  certificador_id: number;

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
  @Transform(({ value }) => (typeof value === 'string' ? formatearRut(value) || undefined : value))
  @IsRut()
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
