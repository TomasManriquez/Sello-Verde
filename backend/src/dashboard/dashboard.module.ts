import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Alerta } from '../alertas/entities/alerta.entity';
import { AlertasModule } from '../alertas/alertas.module';

@Module({
  imports: [TypeOrmModule.forFeature([Establecimiento, Alerta]), AlertasModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
