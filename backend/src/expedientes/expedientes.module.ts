import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpedientesController } from './expedientes.controller';
import { ExpedientesService } from './expedientes.service';
import { Expediente } from './entities/expediente.entity';
import { HitoTC6 } from './entities/hito-tc6.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Alerta } from '../alertas/entities/alerta.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expediente, HitoTC6, Establecimiento, Alerta]),
  ],
  controllers: [ExpedientesController],
  providers: [ExpedientesService],
  exports: [ExpedientesService, TypeOrmModule],
})
export class ExpedientesModule {}
