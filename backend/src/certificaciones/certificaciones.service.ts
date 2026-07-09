import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Certificacion } from './entities/certificacion.entity';
import { Defecto } from './entities/defecto.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Alerta } from '../alertas/entities/alerta.entity';
import {
  CreateCertificacionDto,
  BulkCreateDefectosDto,
} from './dto/create-certificacion.dto';
import { TipoSello, TipoAlerta, EstadoGeneral, EstadoAlerta } from '../common/enums';

@Injectable()
export class CertificacionesService {
  constructor(
    @InjectRepository(Certificacion)
    private certRepository: Repository<Certificacion>,
    @InjectRepository(Defecto)
    private defectoRepository: Repository<Defecto>,
    @InjectRepository(Expediente)
    private expedienteRepository: Repository<Expediente>,
    @InjectRepository(Establecimiento)
    private establecimientoRepository: Repository<Establecimiento>,
    @InjectRepository(Alerta)
    private alertaRepository: Repository<Alerta>,
  ) {}

  async findByExpediente(expedienteId: number) {
    const expediente = await this.expedienteRepository.findOne({
      where: { id: expedienteId },
    });
    if (!expediente) {
      throw new NotFoundException(`Expediente #${expedienteId} no encontrado`);
    }

    const items = await this.certRepository.find({
      where: { expediente_id: expedienteId },
      relations: ['defectos', 'local', 'instalacion', 'alertas'],
      order: { created_at: 'DESC' },
    });

    return { data: items, message: 'OK' };
  }

  async create(expedienteId: number, dto: CreateCertificacionDto) {
    const expediente = await this.expedienteRepository.findOne({
      where: { id: expedienteId },
      relations: ['establecimiento'],
    });
    if (!expediente) {
      throw new NotFoundException(`Expediente #${expedienteId} no encontrado`);
    }

    // Validación: sello amarillo/rojo requiere al menos un defecto
    if (
      (dto.tipo_sello === TipoSello.AMARILLO || dto.tipo_sello === TipoSello.ROJO) &&
      (!dto.defectos || dto.defectos.length === 0)
    ) {
      throw new BadRequestException(
        `El sello ${dto.tipo_sello} requiere registrar al menos un defecto.`,
      );
    }

    // Crear la certificación
    const { defectos: defectosDto, ...certData } = dto;
    const cert = this.certRepository.create({
      ...certData,
      expediente_id: expedienteId,
    });
    const saved = await this.certRepository.save(cert);

    // Crear defectos inline si se enviaron
    if (defectosDto && defectosDto.length > 0) {
      const defectos = defectosDto.map((d) =>
        this.defectoRepository.create({ ...d, certificacion_id: saved.id }),
      );
      await this.defectoRepository.save(defectos);
    }

    // Auto-generate alert based on tipo_sello (with lifecycle management)
    if (dto.tipo_sello && dto.fecha_inspeccion) {
      const fechaInspeccion = new Date(dto.fecha_inspeccion);
      const nombreEE = expediente.establecimiento?.nombre ?? `Expediente #${expedienteId}`;

      // ─── Desactivar alertas anteriores para la misma instalación (o expediente si no hay instalación) ───
      const alertasPrevias = await this.alertaRepository.find({
        where: [
          {
            expediente_id: expedienteId,
            estado: In([EstadoAlerta.ACTIVA, EstadoAlerta.NOTIFICADA]),
            instalacion_id: dto.instalacion_id ?? null,
          },
          {
            expediente_id: expedienteId,
            estado: In([EstadoAlerta.ACTIVA, EstadoAlerta.NOTIFICADA]),
            instalacion_id: IsNull(), // Captura alertas legacy generales
          }
        ],
      });
      if (alertasPrevias.length > 0) {
        await this.alertaRepository.update(
          alertasPrevias.map((a) => a.id),
          { estado: EstadoAlerta.RESUELTA },
        );
      }

      // ─── Crear nueva alerta ───
      let alertaData: Partial<Alerta> = {
        expediente_id: expedienteId,
        certificacion_id: saved.id,
        instalacion_id: dto.instalacion_id ?? null,
      };

      if (dto.tipo_sello === TipoSello.VERDE) {
        const fechaVencimiento = new Date(fechaInspeccion);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 730);
        const localInfo = dto.local_id ? ` — Local #${dto.local_id}` : '';
        alertaData = {
          ...alertaData,
          tipo: TipoAlerta.VENCIMIENTO_SELLO_VERDE,
          fecha_vencimiento: fechaVencimiento,
          mensaje: `${nombreEE}${localInfo} — Sello Verde vence el ${fechaVencimiento.toLocaleDateString('es-CL')}`,
        };
        expediente.estado_general = EstadoGeneral.SELLO_VERDE;
      } else if (dto.tipo_sello === TipoSello.ROJO || dto.tipo_sello === TipoSello.AMARILLO) {
        const fechaVencimiento = new Date(fechaInspeccion);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 90);
        const tipoLabel = dto.tipo_sello === TipoSello.ROJO ? '🔴 Rojo' : '🟡 Amarillo';
        const localInfo = dto.local_id ? ` — Local #${dto.local_id}` : '';
        alertaData = {
          ...alertaData,
          tipo: TipoAlerta.PLAZO_REGULARIZACION_90D,
          fecha_vencimiento: fechaVencimiento,
          mensaje: `${nombreEE}${localInfo} — Sello ${tipoLabel}: plazo regularización vence el ${fechaVencimiento.toLocaleDateString('es-CL')}`,
        };
        expediente.estado_general =
          dto.tipo_sello === TipoSello.ROJO ? EstadoGeneral.SELLO_ROJO : EstadoGeneral.SELLO_AMARILLO;
      }

      await this.alertaRepository.save(this.alertaRepository.create(alertaData));

      // Guardar estado del expediente
      await this.expedienteRepository.save(expediente);

      // Sincronizar al establecimiento
      if (expediente.establecimiento) {
        expediente.establecimiento.estado_general = expediente.estado_general;
        await this.establecimientoRepository.save(expediente.establecimiento);
      }
    }

    const result = await this.certRepository.findOne({
      where: { id: saved.id },
      relations: ['defectos', 'local', 'instalacion', 'alertas'],
    });

    return {
      data: result,
      message: 'Certificación creada exitosamente',
    };
  }

  // Defectos
  async findDefectos(certificacionId: number) {
    const cert = await this.certRepository.findOne({
      where: { id: certificacionId },
    });
    if (!cert) {
      throw new NotFoundException(`Certificación #${certificacionId} no encontrada`);
    }

    const defectos = await this.defectoRepository.find({
      where: { certificacion_id: certificacionId },
    });

    return { data: defectos, message: 'OK' };
  }

  async createDefectos(certificacionId: number, dto: BulkCreateDefectosDto) {
    const cert = await this.certRepository.findOne({
      where: { id: certificacionId },
    });
    if (!cert) {
      throw new NotFoundException(`Certificación #${certificacionId} no encontrada`);
    }

    const defectos = dto.defectos.map((d) =>
      this.defectoRepository.create({
        ...d,
        certificacion_id: certificacionId,
      }),
    );

    const saved = await this.defectoRepository.save(defectos);
    return {
      data: saved,
      message: `${saved.length} defecto(s) creado(s) exitosamente`,
    };
  }
}
