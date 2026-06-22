import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CertificacionesService } from './certificaciones.service';
import {
  CreateCertificacionDto,
  BulkCreateDefectosDto,
} from './dto/create-certificacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class CertificacionesController {
  constructor(private readonly service: CertificacionesService) {}

  @Get('expedientes/:expedienteId/certificaciones')
  findByExpediente(@Param('expedienteId', ParseIntPipe) expedienteId: number) {
    return this.service.findByExpediente(expedienteId);
  }

  @Post('expedientes/:expedienteId/certificaciones')
  create(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @Body() dto: CreateCertificacionDto,
  ) {
    return this.service.create(expedienteId, dto);
  }

  @Get('certificaciones/:id/defectos')
  findDefectos(@Param('id', ParseIntPipe) id: number) {
    return this.service.findDefectos(id);
  }

  @Post('certificaciones/:id/defectos')
  createDefectos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BulkCreateDefectosDto,
  ) {
    return this.service.createDefectos(id, dto);
  }
}
