import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AlertasService } from './alertas.service';
import { UpdateAlertaDto } from './dto/alerta.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TipoAlerta, EstadoAlerta } from '../common/enums';

@UseGuards(JwtAuthGuard)
@Controller('alertas')
export class AlertasController {
  constructor(private readonly service: AlertasService) {}

  @Get()
  findAll(
    @Query('tipo') tipo?: TipoAlerta,
    @Query('estado') estado?: EstadoAlerta,
    @Query('days_until_expiry') days_until_expiry?: number,
    @Query('expediente_id') expediente_id?: number,
  ) {
    return this.service.findAll({ tipo, estado, days_until_expiry, expediente_id });
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlertaDto,
  ) {
    return this.service.update(id, dto);
  }
}
