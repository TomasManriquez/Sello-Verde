import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Alerta } from './entities/alerta.entity';
import { UpdateAlertaDto } from './dto/alerta.dto';
import { EstadoAlerta, TipoAlerta } from '../common/enums';

@Injectable()
export class AlertasService {
  constructor(
    @InjectRepository(Alerta)
    private alertaRepository: Repository<Alerta>,
  ) {}

  async findAll(filters?: {
    tipo?: TipoAlerta;
    estado?: EstadoAlerta;
    days_until_expiry?: number;
    expediente_id?: number;
  }) {
    const qb = this.alertaRepository
      .createQueryBuilder('alerta')
      .leftJoinAndSelect('alerta.expediente', 'expediente')
      .leftJoinAndSelect('expediente.establecimiento', 'establecimiento')
      .leftJoinAndSelect('alerta.certificacion', 'certificacion')
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

    // Add computed dias_restantes to each alert
    const withDays = items.map((alerta) => {
      if (!alerta.fecha_vencimiento) {
        return { ...alerta, dias_restantes: null };
      }
      const today = new Date();
      const expiry = new Date(alerta.fecha_vencimiento);
      if (isNaN(expiry.getTime())) {
        return { ...alerta, dias_restantes: null };
      }
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...alerta, dias_restantes: diffDays };
    });

    return { data: withDays, message: 'OK', total: withDays.length };
  }

  async update(id: number, dto: UpdateAlertaDto) {
    const alerta = await this.alertaRepository.findOne({ where: { id } });
    if (!alerta) {
      throw new NotFoundException(`Alerta #${id} no encontrada`);
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

    const items = await this.alertaRepository.find({
      where: {
        estado: EstadoAlerta.ACTIVA,
        fecha_vencimiento: LessThanOrEqual(targetDate),
      },
      relations: ['expediente', 'expediente.establecimiento'],
      order: { fecha_vencimiento: 'ASC' },
    });

    const withDays = items.map((alerta) => {
      if (!alerta.fecha_vencimiento) {
        return { ...alerta, dias_restantes: null };
      }
      const today = new Date();
      const expiry = new Date(alerta.fecha_vencimiento);
      if (isNaN(expiry.getTime())) {
        return { ...alerta, dias_restantes: null };
      }
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...alerta, dias_restantes: diffDays };
    });

    return { data: withDays, message: 'OK', total: withDays.length };
  }

  // Daily cron at 8am: mark alerts with <= 30 days as 'notificada'
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
      // Future: Send Gmail notification here
      // await this.gmailService.sendAlert(alerta);
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
}
