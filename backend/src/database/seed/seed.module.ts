import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Usuario } from '../../auth/entities/usuario.entity';
import { Establecimiento } from '../../establecimientos/entities/establecimiento.entity';
import { Local } from '../../establecimientos/entities/local.entity';
import { Instalacion } from '../../instalaciones/entities/instalacion.entity';
import { Expediente } from '../../expedientes/entities/expediente.entity';
import { Certificacion } from '../../certificaciones/entities/certificacion.entity';
import { Defecto } from '../../certificaciones/entities/defecto.entity';
import { Alerta } from '../../alertas/entities/alerta.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Establecimiento,
      Local,
      Instalacion,
      Expediente,
      Certificacion,
      Defecto,
      Alerta,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
