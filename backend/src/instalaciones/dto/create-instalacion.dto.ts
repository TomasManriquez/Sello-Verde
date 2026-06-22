import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoGas, Abastecimiento, ZonaAbastecimiento } from '../../common/enums';

export class CreateInstalacionDto {
  @IsOptional()
  @IsEnum(TipoGas)
  tipo_gas?: TipoGas;

  @IsOptional()
  @IsEnum(Abastecimiento)
  abastecimiento?: Abastecimiento;

  @IsOptional()
  @IsEnum(ZonaAbastecimiento)
  zona_abastecimiento?: ZonaAbastecimiento;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsString()
  artefacto_cilindro?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
