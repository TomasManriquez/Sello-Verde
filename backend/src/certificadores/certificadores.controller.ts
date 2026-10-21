import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CertificadoresService } from './certificadores.service';
import { CreateCertificadorDto, UpdateCertificadorDto } from './dto/certificador.dto';
import { FusionDto } from '../empresas/dto/empresa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('certificadores')
export class CertificadoresController {
  constructor(private readonly service: CertificadoresService) {}

  @Get()
  findAll(@Query('q') q?: string, @Query('activo') activo?: string) {
    return this.service.findAll({
      q,
      activo: activo === undefined ? undefined : activo === 'true',
    });
  }

  @Post()
  create(@Body() dto: CreateCertificadorDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCertificadorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/fusionar')
  fusionar(@Param('id', ParseIntPipe) id: number, @Body() dto: FusionDto) {
    return this.service.fusionar(id, dto.destino_id);
  }
}
