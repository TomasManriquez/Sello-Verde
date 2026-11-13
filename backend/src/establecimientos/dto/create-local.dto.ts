import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateLocalDto {
  // Solo al editar; al crear lo asigna el servidor
  @IsOptional()
  @IsNumber()
  numero_local?: number;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsBoolean()
  usa_gas?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
