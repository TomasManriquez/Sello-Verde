import { IsEnum, IsOptional } from 'class-validator';
import { EstadoAlerta, TipoAlerta } from '../../common/enums';

export class UpdateAlertaDto {
  @IsEnum(EstadoAlerta)
  estado: EstadoAlerta;
}

export class FilterAlertaDto {
  @IsOptional()
  @IsEnum(TipoAlerta)
  tipo?: TipoAlerta;

  @IsOptional()
  @IsEnum(EstadoAlerta)
  estado?: EstadoAlerta;

  @IsOptional()
  days_until_expiry?: number;
}
