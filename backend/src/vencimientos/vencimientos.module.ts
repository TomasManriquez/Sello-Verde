import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VencimientosController } from './vencimientos.controller';
import { VencimientosService } from './vencimientos.service';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Establecimiento])],
  controllers: [VencimientosController],
  providers: [VencimientosService],
})
export class VencimientosModule {}
