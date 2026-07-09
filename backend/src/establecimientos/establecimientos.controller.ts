import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { EstablecimientosService } from './establecimientos.service';
import { CreateEstablecimientoDto } from './dto/create-establecimiento.dto';
import { CreateLocalDto } from './dto/create-local.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
