import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { EstadoGeneral } from '../common/enums';
import { calcularSellos, derivarEstadoGeneral, expedienteActivo } from '../common/sellos.util';
import { calcularVencimientos, resumirVencimientos } from '../common/vencimientos.util';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Establecimiento)
    private establecimientoRepository: Repository<Establecimiento>,
  ) {}

  async getResumen() {
    // El estado de cada establecimiento se deriva de sus instalaciones (no del campo guardado)
    const establecimientos = await this.establecimientoRepository.find({
      relations: ['locales', 'locales.instalaciones', 'expedientes', 'expedientes.certificaciones'],
    });

    const conteo: Partial<Record<EstadoGeneral, number>> = {};
    for (const est of establecimientos) {
      const activo = expedienteActivo(est.expedientes);
      const sellos = calcularSellos(est.locales, activo?.certificaciones);
      const estado = derivarEstadoGeneral({
        expediente: activo,
        sellos,
        certificaciones: activo?.certificaciones,
        locales: est.locales,
      });
      conteo[estado] = (conteo[estado] ?? 0) + 1;
    }
    const total_ee = establecimientos.length;
    const sin_gestion = conteo[EstadoGeneral.SIN_GESTION] ?? 0;
    const en_levantamiento = conteo[EstadoGeneral.EN_LEVANTAMIENTO] ?? 0;
    const en_proyecto = conteo[EstadoGeneral.EN_PROYECTO] ?? 0;
    const en_regularizacion = conteo[EstadoGeneral.EN_REGULARIZACION] ?? 0;
    const sello_verde = conteo[EstadoGeneral.SELLO_VERDE] ?? 0;
    const sello_rojo = conteo[EstadoGeneral.SELLO_ROJO] ?? 0;
    const sello_amarillo = conteo[EstadoGeneral.SELLO_AMARILLO] ?? 0;
    // `en_certificacion` es un estado legado que ya no se deriva
    const en_certificacion = 0;

    const vencimientos = resumirVencimientos(calcularVencimientos(establecimientos));

    return {
      data: {
        total_ee,
        sin_gestion,
        en_levantamiento,
        en_proyecto,
        en_certificacion,
        sello_verde,
        sello_rojo,
        sello_amarillo,
        en_regularizacion,
        vencimientos,
      },
      message: 'OK',
    };
  }
}
