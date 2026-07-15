import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expediente } from './entities/expediente.entity';
import { HitoTC6 } from './entities/hito-tc6.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Alerta } from '../alertas/entities/alerta.entity';
import { CreateExpedienteDto, UpdateEstadoTC6Dto } from './dto/create-expediente.dto';
import { EstadoTC6, EstadoGeneral } from '../common/enums';

// TC6 forward transition rules
const TC6_TRANSITIONS: Record<EstadoTC6, EstadoTC6[]> = {
  [EstadoTC6.SIN_INICIAR]: [EstadoTC6.EN_ELABORACION],
  [EstadoTC6.EN_ELABORACION]: [EstadoTC6.INGRESADO_SEC],
  [EstadoTC6.INGRESADO_SEC]: [EstadoTC6.OBSERVADO, EstadoTC6.TC6_APROBADO],
  [EstadoTC6.OBSERVADO]: [EstadoTC6.TC6_APROBADO],
  [EstadoTC6.TC6_APROBADO]: [],
};

// TC6 reverse transition rules (undo)
const TC6_REVERSE: Record<EstadoTC6, EstadoTC6 | null> = {
  [EstadoTC6.SIN_INICIAR]: null,
  [EstadoTC6.EN_ELABORACION]: EstadoTC6.SIN_INICIAR,
  [EstadoTC6.INGRESADO_SEC]: EstadoTC6.EN_ELABORACION,
  [EstadoTC6.OBSERVADO]: EstadoTC6.INGRESADO_SEC,
  [EstadoTC6.TC6_APROBADO]: EstadoTC6.OBSERVADO,
};

@Injectable()
export class ExpedientesService {
  constructor(
    @InjectRepository(Expediente)
    private expedienteRepository: Repository<Expediente>,
    @InjectRepository(HitoTC6)
    private hitoRepository: Repository<HitoTC6>,
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
        'establecimiento.locales.instalaciones',
        'certificaciones',
        'certificaciones.defectos',
        'certificaciones.local',
        'certificaciones.instalacion',
        'certificaciones.alertas',
        'documentos',
        'hitos',
      ],
      order: { hitos: { fecha: 'ASC' } } as any,
    });

    if (!item) {
      throw new NotFoundException(`Expediente #${id} no encontrado`);
    }

    const alertas = await this.alertaRepository.find({
      where: { expediente_id: id },
      relations: ['instalacion', 'instalacion.local'],
      order: { fecha_vencimiento: 'ASC' },
    });

    // Normalise nested documents: add the relative URL so the frontend
    // can build the full absolute URL via API_HOST + doc.url
    const documentos = (item.documentos ?? []).map((doc) => {
      const normalized = doc.ruta.replace(/\\/g, '/');
      const url = normalized.startsWith('/') ? normalized : `/${normalized}`;
      return { ...doc, url };
    });

    return { data: { ...item, documentos, alertas }, message: 'OK' };
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

    // Validar que no exista ya un expediente para este establecimiento
    const expedienteExistente = await this.expedienteRepository.findOne({
      where: { establecimiento_id: dto.establecimiento_id },
    });
    if (expedienteExistente) {
      throw new BadRequestException(
        `El establecimiento ya tiene un expediente activo (#${expedienteExistente.id}). No se pueden crear expedientes duplicados.`,
      );
    }

    const item = this.expedienteRepository.create(dto);
    const saved = await this.expedienteRepository.save(item);

    // Registrar hito inicial
    await this.hitoRepository.save(
      this.hitoRepository.create({
        expediente_id: saved.id,
        estado_anterior: null,
        estado_nuevo: EstadoTC6.SIN_INICIAR,
        observaciones: 'Expediente creado',
      }),
    );

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

    const estadoAnterior = item.estado_tc6;
    item.estado_tc6 = dto.nuevo_estado;

    if (dto.nuevo_estado === EstadoTC6.TC6_APROBADO) {
      item.estado_general = EstadoGeneral.EN_CERTIFICACION;
    } else if (
      item.estado_general === EstadoGeneral.SIN_GESTION ||
      item.estado_general === EstadoGeneral.EN_LEVANTAMIENTO
    ) {
      item.estado_general = EstadoGeneral.EN_PROYECTO;
    }

    const saved = await this.expedienteRepository.save(item);

    // Registrar hito
    await this.hitoRepository.save(
      this.hitoRepository.create({
        expediente_id: id,
        estado_anterior: estadoAnterior,
        estado_nuevo: dto.nuevo_estado,
        observaciones: dto.observaciones,
      }),
    );

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

  async revertEstadoTC6(id: number, observaciones?: string) {
    const item = await this.expedienteRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Expediente #${id} no encontrado`);
    }

    const estadoAnterior = TC6_REVERSE[item.estado_tc6];
    if (estadoAnterior === null || estadoAnterior === undefined) {
      throw new BadRequestException(
        `No se puede deshacer el estado inicial (${item.estado_tc6}).`,
      );
    }

    const estadoActual = item.estado_tc6;
    item.estado_tc6 = estadoAnterior;

    // Revert estado_general acorde
    if (estadoAnterior === EstadoTC6.SIN_INICIAR) {
      item.estado_general = EstadoGeneral.EN_LEVANTAMIENTO;
    } else if (item.estado_general === EstadoGeneral.EN_CERTIFICACION) {
      item.estado_general = EstadoGeneral.EN_PROYECTO;
    }

    const saved = await this.expedienteRepository.save(item);

    // Registrar hito de reversión
    await this.hitoRepository.save(
      this.hitoRepository.create({
        expediente_id: id,
        estado_anterior: estadoActual,
        estado_nuevo: estadoAnterior,
        observaciones: observaciones ?? '↩ Reversión de estado TC6',
      }),
    );

    const est = await this.establecimientoRepository.findOne({
      where: { id: item.establecimiento_id },
    });
    if (est) {
      est.estado_general = item.estado_general;
      await this.establecimientoRepository.save(est);
    }

    return {
      data: saved,
      message: `Estado TC6 revertido a ${estadoAnterior}`,
    };
  }
}
