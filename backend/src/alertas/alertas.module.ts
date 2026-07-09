import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertasController } from './alertas.controller';
import { AlertasService } from './alertas.service';
import { Alerta } from './entities/alerta.entity';
import { Certificacion } from '../certificaciones/entities/certificacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Alerta, Certificacion])],
  controllers: [AlertasController],
  providers: [AlertasService],
  exports: [AlertasService, TypeOrmModule],
})
export class AlertasModule {}
