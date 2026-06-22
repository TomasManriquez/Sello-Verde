import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { InstalacionesService } from './instalaciones.service';
import { CreateInstalacionDto } from './dto/create-instalacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class InstalacionesController {
  constructor(private readonly service: InstalacionesService) {}

  @Get('locales/:localId/instalaciones')
  findByLocal(@Param('localId', ParseIntPipe) localId: number) {
    return this.service.findByLocal(localId);
  }

  @Post('locales/:localId/instalaciones')
  create(
    @Param('localId', ParseIntPipe) localId: number,
    @Body() dto: CreateInstalacionDto,
  ) {
    return this.service.create(localId, dto);
  }

  @Put('instalaciones/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateInstalacionDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete('instalaciones/:id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
