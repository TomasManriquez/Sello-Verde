import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class AsignarEmpresaDto {
  /** Establecimientos a los que se asigna la empresa (se inicia la gestión si aún no la tienen) */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(1000)
  @IsInt({ each: true })
  establecimiento_ids: number[];

  @IsInt()
  empresa_id: number;
}
