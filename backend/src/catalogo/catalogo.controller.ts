import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatalogoService } from './catalogo.service';

@UseGuards(JwtAuthGuard)
@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly service: CatalogoService) {}

  @Get('establecimientos/:rbd')
  buscarPorRbd(@Param('rbd') rbd: string) {
    return this.service.buscarPorRbd(rbd);
  }
}
