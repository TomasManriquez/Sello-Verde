import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Expediente } from './entities/expediente.entity';
import { HitoTC6 } from './entities/hito-tc6.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Alerta } from '../alertas/entities/alerta.entity';
import { CreateExpedienteDto, UpdateEstadoTC6Dto } from './dto/create-expediente.dto';
import { EstadoTC6, EstadoGeneral } from '../common/enums';
import { calcularSellos, derivarEstadoGeneral } from '../common/sellos.util';
import { EmpresasService } from '../empresas/empresas.service';

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
    @Inject(forwardRef(() => EmpresasService))
    private empresasService: EmpresasService,
  ) {}

  async findAll() {
    const items = await this.expedienteRepository.find({
      relations: [
        'establecimiento',
        'establecimiento.locales',
        'establecimiento.locales.instalaciones',
        'certificaciones',
        'empresa',
      ],
      order: { created_at: 'DESC' },
    });

    const conEstado = items.map((exp) => {
      // Estado derivado de las instalaciones (el campo guardado es solo un caché)
      const sellos = calcularSellos(exp.establecimiento?.locales, exp.certificaciones);
      const estado_general = derivarEstadoGeneral({
        expediente: exp,
        sellos,
        certificaciones: exp.certificaciones,
        locales: exp.establecimiento?.locales,
      });
      return { ...exp, estado_general };
    });

    return { data: conEstado, message: 'OK', total: conEstado.length };
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
        'certificaciones.certificador',
        'empresa',
        'documentos',
        'hitos',
      ],
      order: { hitos: { fecha: 'ASC' } } as any,
    });

    if (!item) {
      throw new NotFoundException(`Expediente #${id} no encontrado`);
    }

    // Normalise nested documents: add the relative URL so the frontend
    // can build the full absolute URL via API_HOST + doc.url
    const documentos = (item.documentos ?? []).map((doc) => {
      const normalized = doc.ruta.replace(/\\/g, '/');
      const url = normalized.startsWith('/') ? normalized : `/${normalized}`;
      return { ...doc, url };
    });

    // Sello por instalación y estado general derivado (el peor sello manda)
    const sellos = calcularSellos(item.establecimiento?.locales, item.certificaciones);
    const estado_general = derivarEstadoGeneral({
      expediente: item,
      sellos,
      certificaciones: item.certificaciones,
      locales: item.establecimiento?.locales,
    });

    return {
      data: {
        ...item,
        estado_general,
        documentos,
        sellos_instalaciones: sellos,
      },
      message: 'OK',
    };
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

    if (dto.empresa_id) {
      await this.empresasService.findOneOrFail(dto.empresa_id);
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

    if (dto.empresa_id) {
      await this.empresasService.findOneOrFail(dto.empresa_id);
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
      // TC6 aprobado ⇒ el proyecto pasa a obras / regularización (aún sin inspección)
      item.estado_general = EstadoGeneral.EN_REGULARIZACION;
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
    } else if (
      item.estado_general === EstadoGeneral.EN_REGULARIZACION ||
      item.estado_general === EstadoGeneral.EN_CERTIFICACION // legado
    ) {
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

    /**
   * Eliminación lógica en cascada al eliminar un establecimiento:
   * 1. Soft-delete de todas las alertas pertenecientes a sus expedientes.
   * 2. Soft-delete de todos los expedientes del establecimiento.
   */

  async removeByEstablecimiento(establecimientoId: number) {
    const expedientes = await this.expedienteRepository.find({
      where: { establecimiento_id: establecimientoId },
    });
    if (!expedientes || expedientes.length === 0) return;

    const ids = expedientes.map((e) => e.id);
//1. softdelete de todas las alertas del establecimiento

    await this.alertaRepository.softDelete ({ expediente_id: In(ids)},);
    await this.expedienteRepository.softDelete(ids);
  }

  /** Usado por la fusión de empresas: traspasa los expedientes de una empresa a otra. */
  async reasignarEmpresa(origenId: number, destinoId: number): Promise<number> {
    const res = await this.expedienteRepository.update({ empresa_id: origenId }, { empresa_id: destinoId });
    return res.affected ?? 0;
  }

  /**
   * Asigna una empresa a varios establecimientos. Si un establecimiento no tiene gestión iniciada,
   * se crea su expediente con esa empresa; si ya la tiene, se cambia la empresa.
   */
  async asignarEmpresaEnBloque(establecimientoIds: number[], empresaId: number) {
    const empresa = await this.empresasService.findOneOrFail(empresaId);

    let actualizados = 0;
    let creados = 0;
    const omitidos: number[] = [];

    for (const establecimientoId of establecimientoIds) {
      const existente = await this.expedienteRepository.findOne({
        where: { establecimiento_id: establecimientoId },
      });
      if (existente) {
        if (existente.empresa_id !== empresa.id) {
          await this.expedienteRepository.update(existente.id, { empresa_id: empresa.id });
          actualizados++;
        }
        continue;
      }
      try {
        await this.create({ establecimiento_id: establecimientoId, empresa_id: empresa.id });
        creados++;
      } catch (err) {
        if (err instanceof NotFoundException) omitidos.push(establecimientoId);
        else throw err;
      }
    }

    return {
      data: { actualizados, creados, omitidos },
      message: `${empresa.razon_social}: ${creados} gestión(es) iniciada(s), ${actualizados} actualizada(s)`,
    };
  }

  async remove(id: number) {
    const item = await this.expedienteRepository.findOne({ where: { id } });
    if (!item)  {
      throw new NotFoundException(`Expediente #${id} no encontrado`);
    }

    await this.alertaRepository.softDelete({ expediente_id: id});

    return { message: 'Expediente eliminado exitosamente' };
  }
}
