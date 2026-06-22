import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificacion } from './entities/certificacion.entity';
import { Defecto } from './entities/defecto.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Alerta } from '../alertas/entities/alerta.entity';
import {
  CreateCertificacionDto,
  BulkCreateDefectosDto,
} from './dto/create-certificacion.dto';
import { TipoSello, TipoAlerta, EstadoGeneral } from '../common/enums';

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
      relations: ['defectos'],
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

    const cert = this.certRepository.create({
      ...dto,
      expediente_id: expedienteId,
    });
    const saved = await this.certRepository.save(cert);

    // Auto-generate alert based on tipo_sello
    if (dto.tipo_sello && dto.fecha_inspeccion) {
      const fechaInspeccion = new Date(dto.fecha_inspeccion);
      let alertaData: Partial<Alerta> = {
        expediente_id: expedienteId,
        certificacion_id: saved.id,
      };

      if (dto.tipo_sello === TipoSello.VERDE) {
        // Sello Verde: alert in 2 years (730 days)
        const fechaVencimiento = new Date(fechaInspeccion);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 730);
        alertaData = {
          ...alertaData,
          tipo: TipoAlerta.VENCIMIENTO_SELLO_VERDE,
          fecha_vencimiento: fechaVencimiento,
          mensaje: `Sello Verde vence el ${fechaVencimiento.toLocaleDateString('es-CL')}`,
        };

        // Update estados
        expediente.estado_general = EstadoGeneral.SELLO_VERDE;
      } else if (
        dto.tipo_sello === TipoSello.ROJO ||
        dto.tipo_sello === TipoSello.AMARILLO
      ) {
        // Sello Rojo/Amarillo: 90 days to regularize
        const fechaVencimiento = new Date(fechaInspeccion);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 90);
        alertaData = {
          ...alertaData,
          tipo: TipoAlerta.PLAZO_REGULARIZACION_90D,
          fecha_vencimiento: fechaVencimiento,
          mensaje: `Plazo de regularización vence el ${fechaVencimiento.toLocaleDateString('es-CL')}`,
        };

        // Update estados
        expediente.estado_general =
          dto.tipo_sello === TipoSello.ROJO
            ? EstadoGeneral.SELLO_ROJO
            : EstadoGeneral.SELLO_AMARILLO;
      }

      await this.alertaRepository.save(
        this.alertaRepository.create(alertaData),
      );

      // Save updated expediente estado
      await this.expedienteRepository.save(expediente);

      // Sync to establecimiento
      if (expediente.establecimiento) {
        expediente.establecimiento.estado_general = expediente.estado_general;
        await this.establecimientoRepository.save(expediente.establecimiento);
      }
    }

    const result = await this.certRepository.findOne({
      where: { id: saved.id },
      relations: ['defectos'],
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
