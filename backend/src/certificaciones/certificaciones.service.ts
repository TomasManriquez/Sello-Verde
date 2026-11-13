import { forwardRef, Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificacion } from './entities/certificacion.entity';
import { Defecto } from './entities/defecto.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import {
  CreateCertificacionDto,
  BulkCreateDefectosDto,
} from './dto/create-certificacion.dto';
import { UpdateCertificacionDto } from './dto/update-certificacion.dto';
import { TipoSello } from '../common/enums';
import { calcularSellos, derivarEstadoGeneral } from '../common/sellos.util';
import { CertificadoresService } from '../certificadores/certificadores.service';

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
    @Inject(forwardRef(() => CertificadoresService))
    private certificadoresService: CertificadoresService,
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
      relations: ['defectos', 'local', 'instalacion', 'certificador'],
      order: { created_at: 'DESC' },
    });

    return { data: items, message: 'OK' };
  }

  async create(expedienteId: number, dto: CreateCertificacionDto) {
    const expediente = await this.expedienteRepository.findOne({
      where: { id: expedienteId },
      relations: [
        'establecimiento',
        'establecimiento.locales',
        'establecimiento.locales.instalaciones',
      ],
    });
    if (!expediente) {
      throw new NotFoundException(`Expediente #${expedienteId} no encontrado`);
    }

    // Resolver local/instalación contra el establecimiento del expediente:
    // valida pertenencia y obtiene el N° de local (no el id de BD) para los mensajes.
    const locales = expediente.establecimiento?.locales ?? [];
    const dueno = locales.find((l) =>
      l.instalaciones?.some((i) => i.id === dto.instalacion_id),
    );
    if (!dueno) {
      throw new BadRequestException(
        'La instalación no pertenece al establecimiento de este expediente.',
      );
    }
    if (dueno.usa_gas === false) {
      throw new BadRequestException('El local de esta instalación está marcado como sin uso de gas.');
    }
    const localId = dueno.id;

    // El certificador debe existir (entidad Certificador)
    await this.certificadoresService.findOneOrFail(dto.certificador_id);

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
      local_id: localId,
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

    // Actualiza el caché de estado (el estado real y los vencimientos se derivan de las instalaciones al leer)
    if (dto.tipo_sello && dto.fecha_inspeccion) {
      await this.sincronizarEstado(expedienteId);
    }

    const result = await this.certRepository.findOne({
      where: { id: saved.id },
      relations: ['defectos', 'local', 'instalacion', 'certificador'],
    });

    return {
      data: result,
      message: 'Certificación creada exitosamente',
    };
  }

  async update(id: number, dto: UpdateCertificacionDto) {
    const cert = await this.certRepository.findOne({
      where: { id },
      relations: ['defectos', 'local', 'expediente', 'expediente.establecimiento'],
    });
    if (!cert) {
      throw new NotFoundException(`Certificación #${id} no encontrada`);
    }

    const { defectos: defectosDto, ...certData } = dto;

    if (dto.certificador_id) {
      await this.certificadoresService.findOneOrFail(dto.certificador_id);
    }

    // Actualizar campos principales
    Object.assign(cert, certData);
    const saved = await this.certRepository.save(cert);

    // Reemplazar defectos si se envió el array
    if (defectosDto !== undefined) {
      await this.defectoRepository.delete({ certificacion_id: id });
      if (defectosDto.length > 0) {
        const defectos = defectosDto.map((d) =>
          this.defectoRepository.create({ ...d, certificacion_id: id }),
        );
        await this.defectoRepository.save(defectos);
      }
    }

    // Los vencimientos se derivan del sello vigente; solo se refresca el caché de estado
    if (dto.tipo_sello || dto.fecha_inspeccion) {
      await this.sincronizarEstado(cert.expediente_id);
    }

    const result = await this.certRepository.findOne({
      where: { id },
      relations: ['defectos', 'local', 'instalacion', 'certificador'],
    });

    return {
      data: result,
      message: 'Certificación actualizada exitosamente',
    };
  }

  /**
   * Recalcula el estado general (el peor sello de las instalaciones manda) y lo guarda
   * como caché en el expediente y el establecimiento. La API siempre lo deriva al leer;
   * este valor solo mantiene coherente la base para consultas directas.
   * Usa update() para no disparar cascadas sobre las relaciones cargadas.
   */
  private async sincronizarEstado(expedienteId: number) {
    const expediente = await this.expedienteRepository.findOne({
      where: { id: expedienteId },
      relations: [
        'establecimiento',
        'establecimiento.locales',
        'establecimiento.locales.instalaciones',
        'certificaciones',
      ],
    });
    if (!expediente) return;

    const sellos = calcularSellos(expediente.establecimiento?.locales, expediente.certificaciones);
    const estado = derivarEstadoGeneral({
      expediente,
      sellos,
      certificaciones: expediente.certificaciones,
      locales: expediente.establecimiento?.locales,
    });

    await this.expedienteRepository.update(expediente.id, { estado_general: estado });
    if (expediente.establecimiento) {
      await this.establecimientoRepository.update(expediente.establecimiento.id, {
        estado_general: estado,
      });
    }
  }

  /** Usado por la fusión de certificadores: traspasa las inspecciones de uno a otro. */
  async reasignarCertificador(origenId: number, destinoId: number): Promise<number> {
    const res = await this.certRepository.update({ certificador_id: origenId }, { certificador_id: destinoId });
    return res.affected ?? 0;
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
