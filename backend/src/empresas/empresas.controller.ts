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
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto, FusionDto, UpdateEmpresaDto } from './dto/empresa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly service: EmpresasService) {}

  @Get()
  findAll(@Query('q') q?: string, @Query('activa') activa?: string) {
    return this.service.findAll({
      q,
      activa: activa === undefined ? undefined : activa === 'true',
    });
  }

  @Post()
  create(@Body() dto: CreateEmpresaDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmpresaDto) {
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
