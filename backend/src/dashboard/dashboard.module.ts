import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Alerta } from '../alertas/entities/alerta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Establecimiento, Alerta])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
