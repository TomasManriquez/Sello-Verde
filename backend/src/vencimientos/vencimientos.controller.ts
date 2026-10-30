import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { VencimientosService } from './vencimientos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('vencimientos')
export class VencimientosController {
  constructor(private readonly service: VencimientosService) {}

  @Get()
  listar(@Query('incluir_al_dia') incluirAlDia?: string) {
    return this.service.listar(incluirAlDia === 'true');
  }
}
