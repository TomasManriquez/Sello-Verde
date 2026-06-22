import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expediente } from './entities/expediente.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Alerta } from '../alertas/entities/alerta.entity';
import { CreateExpedienteDto, UpdateEstadoTC6Dto } from './dto/create-expediente.dto';
import { EstadoTC6, EstadoGeneral } from '../common/enums';

// TC6 state transition rules
const TC6_TRANSITIONS: Record<EstadoTC6, EstadoTC6[]> = {
  [EstadoTC6.SIN_INICIAR]: [EstadoTC6.EN_ELABORACION],
  [EstadoTC6.EN_ELABORACION]: [EstadoTC6.INGRESADO_SEC],
  [EstadoTC6.INGRESADO_SEC]: [EstadoTC6.OBSERVADO, EstadoTC6.TC6_APROBADO],
  [EstadoTC6.OBSERVADO]: [EstadoTC6.TC6_APROBADO],
  [EstadoTC6.TC6_APROBADO]: [],
};

@Injectable()
export class ExpedientesService {
  constructor(
    @InjectRepository(Expediente)
    private expedienteRepository: Repository<Expediente>,
    @InjectRepository(Establecimiento)
    private establecimientoRepository: Repository<Establecimiento>,
    @InjectRepository(Alerta)
    private alertaRepository: Repository<Alerta>,
  ) {}

  async findAll() {
    const items = await this.expedienteRepository.find({
      relations: ['establecimiento', 'certificaciones'],
      order: { created_at: 'DESC' },
    });

    // Add active alerts count
    const withAlerts = await Promise.all(
      items.map(async (exp) => {
        const alertasActivas = await this.alertaRepository.count({
          where: { expediente_id: exp.id, estado: 'activa' as any },
        });
        return { ...exp, alertas_activas: alertasActivas };
      }),
    );

    return { data: withAlerts, message: 'OK', total: withAlerts.length };
  }

  async findOne(id: number) {
    const item = await this.expedienteRepository.findOne({
      where: { id },
      relations: [
        'establecimiento',
        'establecimiento.locales',
        'certificaciones',
        'certificaciones.defectos',
        'documentos',
      ],
    });

    if (!item) {
      throw new NotFoundException(`Expediente #${id} no encontrado`);
    }

    const alertas = await this.alertaRepository.find({
      where: { expediente_id: id },
      order: { fecha_vencimiento: 'ASC' },
    });

    return { data: { ...item, alertas }, message: 'OK' };
  }

  async create(dto: CreateExpedienteDto) {
    const est = await this.establecimientoRepository.findOne({
      where: { id: dto.establecimiento_id },
    });
    if (!est) {
      throw new NotFoundException(
        `Establecimiento #${dto.establecimiento_id} no encontrado`,
      );
    }

    const item = this.expedienteRepository.create(dto);
    const saved = await this.expedienteRepository.save(item);

    // Update establecimiento estado if it's still sin_gestion
    if (est.estado_general === EstadoGeneral.SIN_GESTION) {
      est.estado_general = EstadoGeneral.EN_LEVANTAMIENTO;
      await this.establecimientoRepository.save(est);
    }

    return { data: saved, message: 'Expediente creado exitosamente' };
  }

  async update(id: number, dto: Partial<CreateExpedienteDto>) {
    const item = await this.expedienteRepository.findOne({
      where: { id },
      relations: ['establecimiento'],
    });
    if (!item) {
      throw new NotFoundException(`Expediente #${id} no encontrado`);
    }

    Object.assign(item, dto);
    const saved = await this.expedienteRepository.save(item);

    // Sync estado_general to establecimiento
    if (dto.estado_general && item.establecimiento) {
      item.establecimiento.estado_general = dto.estado_general;
      await this.establecimientoRepository.save(item.establecimiento);
    }

    return { data: saved, message: 'Expediente actualizado exitosamente' };
  }

  async updateEstadoTC6(id: number, dto: UpdateEstadoTC6Dto) {
    const item = await this.expedienteRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Expediente #${id} no encontrado`);
    }

    const allowedTransitions = TC6_TRANSITIONS[item.estado_tc6];
    if (!allowedTransitions.includes(dto.nuevo_estado)) {
      throw new BadRequestException(
        `Transición inválida: ${item.estado_tc6} → ${dto.nuevo_estado}. ` +
          `Transiciones permitidas: ${allowedTransitions.join(', ') || 'ninguna'}`,
      );
    }

    item.estado_tc6 = dto.nuevo_estado;

    // If TC6 approved, update general state to en_certificacion
    if (dto.nuevo_estado === EstadoTC6.TC6_APROBADO) {
      item.estado_general = EstadoGeneral.EN_CERTIFICACION;
    } else if (
      item.estado_general === EstadoGeneral.SIN_GESTION ||
      item.estado_general === EstadoGeneral.EN_LEVANTAMIENTO
    ) {
      item.estado_general = EstadoGeneral.EN_PROYECTO;
    }

    const saved = await this.expedienteRepository.save(item);

    // Sync to establecimiento
    const est = await this.establecimientoRepository.findOne({
      where: { id: item.establecimiento_id },
    });
    if (est) {
      est.estado_general = item.estado_general;
      await this.establecimientoRepository.save(est);
    }

    return {
      data: saved,
      message: `Estado TC6 actualizado a ${dto.nuevo_estado}`,
    };
  }
}
