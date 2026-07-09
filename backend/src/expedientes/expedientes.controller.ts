import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { CreateExpedienteDto, UpdateEstadoTC6Dto } from './dto/create-expediente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('expedientes')
export class ExpedientesController {
  constructor(private readonly service: ExpedientesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateExpedienteDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateExpedienteDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/estado-tc6')
  updateEstadoTC6(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoTC6Dto,
  ) {
    return this.service.updateEstadoTC6(id, dto);
  }

  @Patch(':id/revert-tc6')
  revertEstadoTC6(
    @Param('id', ParseIntPipe) id: number,
    @Body('observaciones') observaciones?: string,
  ) {
    return this.service.revertEstadoTC6(id, observaciones);
  }
}
