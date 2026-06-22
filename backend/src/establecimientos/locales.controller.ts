import { Controller, Put, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { EstablecimientosService } from './establecimientos.service';
import { CreateLocalDto } from './dto/create-local.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('locales')
export class LocalesController {
  constructor(private readonly service: EstablecimientosService) {}

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateLocalDto>,
  ) {
    return this.service.updateLocal(id, dto);
  }
}
