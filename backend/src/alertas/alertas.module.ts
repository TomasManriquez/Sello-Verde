import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertasService } from './alertas.service';
import { Alerta } from './entities/alerta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Alerta])],
  providers: [AlertasService],
  exports: [AlertasService, TypeOrmModule],
})
export class AlertasModule {}
