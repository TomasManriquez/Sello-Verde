import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstalacionesController } from './instalaciones.controller';
import { InstalacionesService } from './instalaciones.service';
import { Instalacion } from './entities/instalacion.entity';
import { Local } from '../establecimientos/entities/local.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Instalacion, Local])],
  controllers: [InstalacionesController],
  providers: [InstalacionesService],
  exports: [InstalacionesService],
})
export class InstalacionesModule {}
