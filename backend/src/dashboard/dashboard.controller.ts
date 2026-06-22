import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('resumen')
  getResumen() {
    return this.service.getResumen();
  }

  @Get('alertas-proximas')
  getAlertasProximas() {
    return this.service.getAlertasProximas();
  }
}
