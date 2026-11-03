import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { EstablecimientosService } from './establecimientos.service';
import { CreateEstablecimientoDto } from './dto/create-establecimiento.dto';
import { CreateLocalDto } from './dto/create-local.dto';
import { ExportEstablecimientosDto } from './dto/export-establecimientos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Capacidad } from '../auth/capacidades';
import { EstadoGeneral } from '../common/enums';

@UseGuards(JwtAuthGuard)
@Controller('establecimientos')
export class EstablecimientosController {
  constructor(private readonly service: EstablecimientosService) {}

  @Get()
  findAll(
    @Query('rbd') rbd?: string,
    @Query('search') search?: string,
    @Query('estado_general') estado_general?: EstadoGeneral,
  ) {
    return this.service.findAll({ rbd, search, estado_general });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // Reporte Excel de los establecimientos seleccionados (una sola hoja)
  @Capacidad('read')
  @Post('export')
  async exportar(@Body() dto: ExportEstablecimientosDto, @Res() res: Response) {
    const buffer = await this.service.exportarExcel(dto.ids);
    const hoy = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="establecimientos_${hoy}.xlsx"`,
    });
    res.send(buffer);
  }

  @Post()
  create(@Body() dto: CreateEstablecimientoDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateEstablecimientoDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // Locales endpoints
  @Get(':id/locales')
  findLocales(@Param('id', ParseIntPipe) id: number) {
    return this.service.findLocales(id);
  }

  @Post(':id/locales')
  createLocal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateLocalDto,
  ) {
    return this.service.createLocal(id, dto);
  }
}
