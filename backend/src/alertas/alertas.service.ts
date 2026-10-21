import { Injectable, Logger, NotFoundException, BadRequestException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Alerta } from './entities/alerta.entity';
import { Certificacion } from '../certificaciones/entities/certificacion.entity';
import { UpdateAlertaDto } from './dto/alerta.dto';
import { EstadoAlerta, ESTADOS_ALERTA_PENDIENTES, TipoAlerta, TipoSello } from '../common/enums';

@Injectable()
export class AlertasService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AlertasService.name);

  constructor(
    @InjectRepository(Alerta)
    private alertaRepository: Repository<Alerta>,
    @InjectRepository(Certificacion)
    private certRepository: Repository<Certificacion>,
  ) {}

  async findAll(filters?: {
    tipo?: TipoAlerta;
    estado?: EstadoAlerta;
    days_until_expiry?: number;
    expediente_id?: number;
  }) {
    // innerJoin: una alerta sin expediente/establecimiento vigente (eliminado) no debe listarse,
    // porque no hay a dónde llevar al usuario.
    const qb = this.alertaRepository
      .createQueryBuilder('alerta')
      .innerJoinAndSelect('alerta.expediente', 'expediente')
      .innerJoinAndSelect('expediente.establecimiento', 'establecimiento')
      .leftJoinAndSelect('alerta.certificacion', 'certificacion')
      .leftJoinAndSelect('alerta.instalacion', 'instalacion')
      .leftJoinAndSelect('instalacion.local', 'local')
      .orderBy('alerta.fecha_vencimiento', 'ASC');

    if (filters?.tipo) {
      qb.andWhere('alerta.tipo = :tipo', { tipo: filters.tipo });
    }

    if (filters?.estado) {
      qb.andWhere('alerta.estado = :estado', { estado: filters.estado });
    }

    if (filters?.expediente_id) {
      qb.andWhere('alerta.expediente_id = :expediente_id', { expediente_id: filters.expediente_id });
    }

    const daysFilter = Number(filters?.days_until_expiry);
    if (filters?.days_until_expiry !== undefined && isFinite(daysFilter)) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysFilter);
      qb.andWhere('alerta.fecha_vencimiento <= :targetDate', {
        targetDate: targetDate.toISOString().split('T')[0],
      });
      qb.andWhere('alerta.fecha_vencimiento >= :today', {
        today: new Date().toISOString().split('T')[0],
      });
    }

    const items = await qb.getMany();

    // Enriquecer con días restantes y nombre del establecimiento
    const withDays = items.map((alerta) => {
      if (!alerta.fecha_vencimiento) return { ...alerta, dias_restantes: null };
      const today = new Date();
      const expiry = new Date(alerta.fecha_vencimiento);
      if (isNaN(expiry.getTime())) return { ...alerta, dias_restantes: null };
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...alerta, dias_restantes: diffDays };
    });

    return { data: withDays, message: 'OK', total: withDays.length };
  }

  async update(id: number, dto: UpdateAlertaDto) {
    const alerta = await this.alertaRepository.findOne({
      where: { id },
      relations: ['expediente'],
    });
    if (!alerta) {
      throw new NotFoundException(`Alerta #${id} no encontrada`);
    }

    // ─── Validación: solo se puede marcar como RESUELTA si hubo un sello verde POSTERIOR a la alerta ───
    // (un verde antiguo, anterior al sello amarillo/rojo, no regulariza nada)
    if (dto.estado === EstadoAlerta.RESUELTA && alerta.tipo === TipoAlerta.PLAZO_REGULARIZACION_90D) {
      // Buscar certificación verde para la misma instalación (o expediente)
      const whereVerde: any = {
        expediente_id: alerta.expediente_id,
        tipo_sello: TipoSello.VERDE,
        created_at: MoreThan(alerta.created_at),
      };
      if (alerta.instalacion_id) {
        whereVerde.instalacion_id = alerta.instalacion_id;
      }
      const sellosVerdes = await this.certRepository.find({ where: whereVerde });

      if (sellosVerdes.length === 0) {
        throw new BadRequestException(
          'No se puede resolver esta alerta: registra primero una nueva inspección con Sello Verde para la instalación.',
        );
      }
    }

    alerta.estado = dto.estado;
    if (dto.estado === EstadoAlerta.NOTIFICADA) {
      alerta.fecha_notificacion = new Date();
    }

    const saved = await this.alertaRepository.save(alerta);
    return { data: saved, message: 'Alerta actualizada exitosamente' };
  }

  async getProximas(days: number = 30) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const items = await this.alertaRepository
      .createQueryBuilder('alerta')
      .innerJoinAndSelect('alerta.expediente', 'expediente')
      .innerJoinAndSelect('expediente.establecimiento', 'establecimiento')
      .leftJoinAndSelect('alerta.instalacion', 'instalacion')
      .leftJoinAndSelect('instalacion.local', 'local')
      .where('alerta.estado IN (:...estados)', { estados: ESTADOS_ALERTA_PENDIENTES })
      .andWhere('alerta.fecha_vencimiento <= :target', { target: targetDate.toISOString().split('T')[0] })
      .orderBy('alerta.fecha_vencimiento', 'ASC')
      .getMany();

    const withDays = items.map((alerta) => {
      if (!alerta.fecha_vencimiento) return { ...alerta, dias_restantes: null };
      const today = new Date();
      const expiry = new Date(alerta.fecha_vencimiento);
      if (isNaN(expiry.getTime())) return { ...alerta, dias_restantes: null };
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...alerta, dias_restantes: diffDays };
    });

    return { data: withDays, message: 'OK', total: withDays.length };
  }

  /** Al arrancar, limpia alertas que quedaron colgando de expedientes, establecimientos o instalaciones eliminados. */
  async onApplicationBootstrap() {
    await this.limpiarHuerfanas();
  }

  async limpiarHuerfanas() {
    const res = await this.alertaRepository
      .createQueryBuilder()
      .softDelete()
      .where('deleted_at IS NULL')
      .andWhere(
        `(expediente_id IN (
            SELECT e.id FROM expedientes e
            LEFT JOIN establecimientos s ON s.id = e.establecimiento_id
            WHERE e.deleted_at IS NOT NULL OR s.deleted_at IS NOT NULL
          )
          OR instalacion_id IN (SELECT i.id FROM instalaciones i WHERE i.deleted_at IS NOT NULL))`,
      )
      .execute();
    if (res.affected) {
      this.logger.log(`Alertas huérfanas eliminadas (soft-delete): ${res.affected}`);
    }
    return res.affected ?? 0;
  }

  /** Cascada al eliminar instalaciones: sus alertas dejan de tener sentido. */
  async removeByInstalaciones(instalacionIds: number[]) {
    if (!instalacionIds || instalacionIds.length === 0) return;
    await this.alertaRepository.softDelete({ instalacion_id: In(instalacionIds) });
  }

  // Daily cron at 8am
  @Cron('0 8 * * *', { name: 'check-alertas' })
  async checkAndNotifyAlerts() {
    console.log('[CRON] Checking alerts at 8am...');

    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const alertasProximas = await this.alertaRepository.find({
      where: {
        estado: EstadoAlerta.ACTIVA,
        fecha_vencimiento: LessThanOrEqual(in30Days),
      },
    });

    for (const alerta of alertasProximas) {
      alerta.estado = EstadoAlerta.NOTIFICADA;
      alerta.fecha_notificacion = new Date();
    }

    if (alertasProximas.length > 0) {
      await this.alertaRepository.save(alertasProximas);
      console.log(`[CRON] Marked ${alertasProximas.length} alert(s) as notificada`);
    }

    // Mark expired alerts
    const today = new Date();
    const expiredAlerts = await this.alertaRepository
      .createQueryBuilder('alerta')
      .where('alerta.estado IN (:...estados)', {
        estados: [EstadoAlerta.ACTIVA, EstadoAlerta.NOTIFICADA],
      })
      .andWhere('alerta.fecha_vencimiento < :today', {
        today: today.toISOString().split('T')[0],
      })
      .getMany();

    for (const alerta of expiredAlerts) {
      alerta.estado = EstadoAlerta.VENCIDA;
    }

    if (expiredAlerts.length > 0) {
      await this.alertaRepository.save(expiredAlerts);
      console.log(`[CRON] Marked ${expiredAlerts.length} alert(s) as vencida`);
    }
  }

  async resolverPorExpedientes(expedienteIds: number[]) {
    if (!expedienteIds || expedienteIds.length === 0) return;
    const alertasActivas = await this.alertaRepository.find({
      where: [
        { expediente_id: In(expedienteIds), estado: EstadoAlerta.ACTIVA },
        { expediente_id: In(expedienteIds), estado: EstadoAlerta.NOTIFICADA },
      ],
    });
    if (alertasActivas.length > 0) {
      await this.alertaRepository.update(
        alertasActivas.map((a) => a.id),
        { estado: EstadoAlerta.RESUELTA },
      );
    }
  }

  async remove(id: number) {
    const alerta = await this.alertaRepository.findOne({ where: { id } });
    if (!alerta) {
      throw new NotFoundException(`Alerta #${id} no encontrada`);
    }
    if (alerta.estado !== EstadoAlerta.RESUELTA) {
      throw new BadRequestException(
        'Solo se pueden eliminar alertas en estado \'resuelta\'. Resuelve la alerta primero.',
      );
    }
    await this.alertaRepository.softDelete(id);
    return { message: 'Alerta eliminada exitosamente' };
  }
}
