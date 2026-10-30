import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Establecimiento])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
