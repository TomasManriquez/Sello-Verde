import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { calcularVencimientos, resumirVencimientos } from '../common/vencimientos.util';

@Injectable()
export class VencimientosService {
  constructor(
    @InjectRepository(Establecimiento)
    private establecimientoRepository: Repository<Establecimiento>,
  ) {}

  /**
   * Vencimientos por instalación, derivados del sello vigente. Por defecto solo los que
   * piden atención (fuera de plazo y próximos 90 días); `incluirAlDia` agrega los sellos
   * verdes con más de 90 días de vigencia.
   */
  async listar(incluirAlDia = false) {
    const establecimientos = await this.establecimientoRepository.find({
      relations: ['locales', 'locales.instalaciones', 'expedientes', 'expedientes.certificaciones'],
    });

    const todos = calcularVencimientos(establecimientos);
    const items = incluirAlDia ? todos : todos.filter((v) => v.urgencia !== 'al_dia');

    return {
      data: { items, resumen: resumirVencimientos(todos) },
      message: 'OK',
    };
  }
}
