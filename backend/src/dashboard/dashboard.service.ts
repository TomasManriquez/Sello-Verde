import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Alerta } from '../alertas/entities/alerta.entity';
import { EstadoGeneral, EstadoAlerta } from '../common/enums';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Establecimiento)
    private establecimientoRepository: Repository<Establecimiento>,
    @InjectRepository(Alerta)
    private alertaRepository: Repository<Alerta>,
  ) {}

  async getResumen() {
    const [
      total_ee,
      sin_gestion,
      en_levantamiento,
      en_proyecto,
      en_certificacion,
      sello_verde,
      sello_rojo,
      sello_amarillo,
      en_regularizacion,
    ] = await Promise.all([
      this.establecimientoRepository.count(),
      this.establecimientoRepository.count({
        where: { estado_general: EstadoGeneral.SIN_GESTION },
      }),
      this.establecimientoRepository.count({
        where: { estado_general: EstadoGeneral.EN_LEVANTAMIENTO },
      }),
      this.establecimientoRepository.count({
        where: { estado_general: EstadoGeneral.EN_PROYECTO },
      }),
      this.establecimientoRepository.count({
        where: { estado_general: EstadoGeneral.EN_CERTIFICACION },
      }),
      this.establecimientoRepository.count({
        where: { estado_general: EstadoGeneral.SELLO_VERDE },
      }),
      this.establecimientoRepository.count({
        where: { estado_general: EstadoGeneral.SELLO_ROJO },
      }),
      this.establecimientoRepository.count({
        where: { estado_general: EstadoGeneral.SELLO_AMARILLO },
      }),
      this.establecimientoRepository.count({
        where: { estado_general: EstadoGeneral.EN_REGULARIZACION },
      }),
    ]);

    const alertas_activas = await this.alertaRepository.count({
      where: { estado: EstadoAlerta.ACTIVA },
    });

    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const alertas_proximas_30d = await this.alertaRepository.count({
      where: {
        estado: EstadoAlerta.ACTIVA,
        fecha_vencimiento: LessThanOrEqual(in30Days),
      },
    });

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
        alertas_activas,
        alertas_proximas_30d,
      },
      message: 'OK',
    };
  }

  async getAlertasProximas() {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const alertas = await this.alertaRepository.find({
      where: {
        estado: EstadoAlerta.ACTIVA,
        fecha_vencimiento: LessThanOrEqual(in30Days),
      },
      relations: ['expediente', 'expediente.establecimiento', 'instalacion', 'instalacion.local'],
      order: { fecha_vencimiento: 'ASC' },
    });

    const withDays = alertas.map((alerta) => {
      const today = new Date();
      const expiry = new Date(alerta.fecha_vencimiento);
      if (isNaN(expiry.getTime())) return { ...alerta, dias_restantes: null };
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...alerta, dias_restantes: diffDays };
    });

    return { data: withDays, message: 'OK', total: withDays.length };
  }
}
