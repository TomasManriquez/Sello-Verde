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
import { UpdateCertificacionDto } from './dto/update-certificacion.dto';
import { TipoSello, TipoAlerta, EstadoAlerta } from '../common/enums';
import {
  calcularSellos,
  derivarEstadoGeneral,
  PLAZO_REGULARIZACION_DIAS,
  VIGENCIA_VERDE_DIAS,
} from '../common/sellos.util';

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
    const localInfo = ` — Local N° ${dueno.numero_local}`;

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

    // Auto-generate alert based on tipo_sello (with lifecycle management)
    if (dto.tipo_sello && dto.fecha_inspeccion) {
      const fechaInspeccion = new Date(dto.fecha_inspeccion);
      const nombreEE = expediente.establecimiento?.nombre ?? `Expediente #${expedienteId}`;

      // ─── Resolver alertas anteriores de la misma instalación (y las generales sin instalación) ───
      // OJO: en TypeORM `{ campo: null }` se ignora en el where; por eso se usa IsNull() explícito.
      // Alertas ya vencidas también se resuelven: la nueva inspección reemplaza su ciclo.
      const estadosPendientes = In([
        EstadoAlerta.ACTIVA,
        EstadoAlerta.NOTIFICADA,
        EstadoAlerta.VENCIDA,
      ]);
      const alertasPrevias = await this.alertaRepository.find({
        where: [
          { expediente_id: expedienteId, estado: estadosPendientes, instalacion_id: dto.instalacion_id },
          { expediente_id: expedienteId, estado: estadosPendientes, instalacion_id: IsNull() },
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
        fechaVencimiento.setDate(fechaVencimiento.getDate() + VIGENCIA_VERDE_DIAS);
        alertaData = {
          ...alertaData,
          tipo: TipoAlerta.VENCIMIENTO_SELLO_VERDE,
          fecha_vencimiento: fechaVencimiento,
          mensaje: `${nombreEE}${localInfo} — Sello Verde vence el ${fechaVencimiento.toLocaleDateString('es-CL')}`,
        };
      } else if (dto.tipo_sello === TipoSello.ROJO || dto.tipo_sello === TipoSello.AMARILLO) {
        const fechaVencimiento = new Date(fechaInspeccion);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + PLAZO_REGULARIZACION_DIAS);
        const tipoLabel = dto.tipo_sello === TipoSello.ROJO ? '🔴 Rojo' : '🟡 Amarillo';
        alertaData = {
          ...alertaData,
          tipo: TipoAlerta.PLAZO_REGULARIZACION_90D,
          fecha_vencimiento: fechaVencimiento,
          mensaje: `${nombreEE}${localInfo} — Sello ${tipoLabel}: plazo regularización vence el ${fechaVencimiento.toLocaleDateString('es-CL')}`,
        };
      }

      await this.alertaRepository.save(this.alertaRepository.create(alertaData));

      // Actualiza el caché de estado (el estado real se deriva de las instalaciones al leer)
      await this.sincronizarEstado(expedienteId);
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

  async update(id: number, dto: UpdateCertificacionDto) {
    const cert = await this.certRepository.findOne({
      where: { id },
      relations: ['defectos', 'local', 'expediente', 'expediente.establecimiento'],
    });
    if (!cert) {
      throw new NotFoundException(`Certificación #${id} no encontrada`);
    }

    const { defectos: defectosDto, ...certData } = dto;

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

    // Sincronizar alerta si se modificó sello o fecha
    if (dto.tipo_sello || dto.fecha_inspeccion) {
      const expediente = cert.expediente;
      const nombreEE = expediente?.establecimiento?.nombre ?? `Expediente #${cert.expediente_id}`;
      const localInfo = cert.local ? ` — Local N° ${cert.local.numero_local}` : '';
      const fechaInspeccion = new Date(saved.fecha_inspeccion);

      let alerta = await this.alertaRepository.findOne({
        where: { certificacion_id: id },
      });

      let alertaData: Partial<Alerta> = {};

      if (saved.tipo_sello === TipoSello.VERDE) {
        const fechaVencimiento = new Date(fechaInspeccion);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + VIGENCIA_VERDE_DIAS);
        alertaData = {
          tipo: TipoAlerta.VENCIMIENTO_SELLO_VERDE,
          fecha_vencimiento: fechaVencimiento,
          mensaje: `${nombreEE}${localInfo} — Sello Verde vence el ${fechaVencimiento.toLocaleDateString('es-CL')}`,
        };
      } else if (saved.tipo_sello === TipoSello.ROJO || saved.tipo_sello === TipoSello.AMARILLO) {
        const fechaVencimiento = new Date(fechaInspeccion);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + PLAZO_REGULARIZACION_DIAS);
        const tipoLabel = saved.tipo_sello === TipoSello.ROJO ? '🔴 Rojo' : '🟡 Amarillo';
        alertaData = {
          tipo: TipoAlerta.PLAZO_REGULARIZACION_90D,
          fecha_vencimiento: fechaVencimiento,
          mensaje: `${nombreEE}${localInfo} — Sello ${tipoLabel}: plazo regularización vence el ${fechaVencimiento.toLocaleDateString('es-CL')}`,
        };
      }

      if (alerta) {
        Object.assign(alerta, alertaData);
        await this.alertaRepository.save(alerta);
      } else {
        alerta = this.alertaRepository.create({
          ...alertaData,
          expediente_id: cert.expediente_id,
          certificacion_id: saved.id,
          instalacion_id: saved.instalacion_id ?? null,
        });
        await this.alertaRepository.save(alerta);
      }

      await this.sincronizarEstado(cert.expediente_id);
    }

    const result = await this.certRepository.findOne({
      where: { id },
      relations: ['defectos', 'local', 'instalacion', 'alertas'],
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
