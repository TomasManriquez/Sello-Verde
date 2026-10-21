import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablecimientosController } from './establecimientos.controller';
import { EstablecimientosService } from './establecimientos.service';
import { Establecimiento } from './entities/establecimiento.entity';
import { Local } from './entities/local.entity';
import { LocalesController } from './locales.controller';
import { ExpedientesModule } from '../expedientes/expedientes.module';
import { InstalacionesModule } from '../instalaciones/instalaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Establecimiento, Local]),
    ExpedientesModule,
    InstalacionesModule,
  ],
  controllers: [EstablecimientosController, LocalesController],
  providers: [EstablecimientosService],
  exports: [EstablecimientosService, TypeOrmModule],
})
export class EstablecimientosModule {}
