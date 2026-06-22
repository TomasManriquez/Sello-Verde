import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablecimientosController } from './establecimientos.controller';
import { EstablecimientosService } from './establecimientos.service';
import { Establecimiento } from './entities/establecimiento.entity';
import { Local } from './entities/local.entity';
import { LocalesController } from './locales.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Establecimiento, Local])],
  controllers: [EstablecimientosController, LocalesController],
  providers: [EstablecimientosService],
  exports: [EstablecimientosService, TypeOrmModule],
})
export class EstablecimientosModule {}
