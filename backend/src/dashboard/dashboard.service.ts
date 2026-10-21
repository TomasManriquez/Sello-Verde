import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Alerta } from '../alertas/entities/alerta.entity';
import { EstadoGeneral, ESTADOS_ALERTA_PENDIENTES } from '../common/enums';
import { calcularSellos, derivarEstadoGeneral, expedienteActivo } from '../common/sellos.util';
import { AlertasService } from '../alertas/alertas.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Establecimiento)
    private establecimientoRepository: Repository<Establecimiento>,
    @InjectRepository(Alerta)
    private alertaRepository: Repository<Alerta>,
    private alertasService: AlertasService,
  ) {}

  /** Alertas pendientes de acción cuyo expediente y establecimiento siguen vigentes. */
  private alertasPendientes() {
    return this.alertaRepository
      .createQueryBuilder('alerta')
      .innerJoin('alerta.expediente', 'expediente')
      .innerJoin('expediente.establecimiento', 'establecimiento')
      .where('alerta.estado IN (:...estados)', { estados: ESTADOS_ALERTA_PENDIENTES });
  }

  async getResumen() {
    // El estado de cada establecimiento se deriva de sus instalaciones (no del campo guardado)
    const establecimientos = await this.establecimientoRepository.find({
      relations: [
        'locales',
        'locales.instalaciones',
        'expedientes',
        'expedientes.certificaciones',
        'expedientes.alertas',
      ],
    });

    const conteo: Partial<Record<EstadoGeneral, number>> = {};
    for (const est of establecimientos) {
      const activo = expedienteActivo(est.expedientes);
      const sellos = calcularSellos(est.locales, activo?.certificaciones, activo?.alertas);
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

    // "Activas" = pendientes de acción (activa + notificada + vencida)
    const alertas_activas = await this.alertasPendientes().getCount();

    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    // Incluye las ya vencidas por fecha (fecha <= hoy + 30)
    const alertas_proximas_30d = await this.alertasPendientes()
      .andWhere('alerta.fecha_vencimiento <= :limite', { limite: in30Days.toISOString().split('T')[0] })
      .getCount();

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
    return this.alertasService.getProximas(30);
  }
}
