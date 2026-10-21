import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificador } from './entities/certificador.entity';
import { CreateCertificadorDto, UpdateCertificadorDto } from './dto/certificador.dto';
import { CertificacionesService } from '../certificaciones/certificaciones.service';

@Injectable()
export class CertificadoresService {
  constructor(
    @InjectRepository(Certificador)
    private certificadorRepository: Repository<Certificador>,
    @Inject(forwardRef(() => CertificacionesService))
    private certificacionesService: CertificacionesService,
  ) {}

  /** Lista con la cantidad de inspecciones que ha validado cada certificador. */
  async findAll(filters?: { q?: string; activo?: boolean }) {
    const items = await this.certificadorRepository.find({
      relations: ['certificaciones'],
      order: { nombre: 'ASC' },
    });

    // Por defecto solo los vigentes: un certificador eliminado no vuelve a mostrarse
    const q = filters?.q?.trim().toLowerCase();
    const data = items
      .filter((c) => c.activo === (filters?.activo ?? true))
      .filter(
        (c) =>
          !q ||
          c.nombre.toLowerCase().includes(q) ||
          (c.rut ?? '').toLowerCase().includes(q) ||
          (c.entidad ?? '').toLowerCase().includes(q),
      )
      .map(({ certificaciones, ...certificador }) => ({
        ...certificador,
        inspecciones: certificaciones?.length ?? 0,
      }));

    return { data, message: 'OK', total: data.length };
  }

  /** Uso interno: valida que exista (para inspecciones) */
  async findOneOrFail(id: number): Promise<Certificador> {
    const item = await this.certificadorRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Certificador #${id} no encontrado`);
    }
    return item;
  }

  /**
   * El RUT es único. Si lo tiene un certificador vigente falla; si lo tiene uno eliminado (oculto,
   * conservado solo por el historial) se le quita el RUT para liberarlo.
   */
  private async validarRutLibre(rut: string | null | undefined, exceptoId?: number) {
    if (!rut) return;
    const existente = await this.certificadorRepository.findOne({ where: { rut } });
    if (!existente || existente.id === exceptoId) return;
    if (existente.activo) {
      throw new ConflictException(
        `Ya existe un certificador con el RUT ${rut}: ${existente.nombre}`,
      );
    }
    existente.rut = null;
    await this.certificadorRepository.save(existente);
  }

  async create(dto: CreateCertificadorDto) {
    // Volver a crear un certificador eliminado (mismo RUT) lo reincorpora con los datos nuevos
    if (dto.rut) {
      const eliminado = await this.certificadorRepository.findOne({ where: { rut: dto.rut, activo: false } });
      if (eliminado) {
        Object.assign(eliminado, {
          nombre: dto.nombre,
          entidad: dto.entidad ?? null,
          telefono: dto.telefono ?? null,
          email: dto.email ?? null,
          activo: true,
        });
        const saved = await this.certificadorRepository.save(eliminado);
        return { data: saved, message: 'Certificador creado exitosamente' };
      }
    }
    await this.validarRutLibre(dto.rut);
    const saved = await this.certificadorRepository.save(this.certificadorRepository.create(dto));
    return { data: saved, message: 'Certificador creado exitosamente' };
  }

  async update(id: number, dto: UpdateCertificadorDto) {
    const item = await this.findOneOrFail(id);
    if (dto.rut !== undefined) await this.validarRutLibre(dto.rut, id);
    Object.assign(item, dto);
    const saved = await this.certificadorRepository.save(item);
    return { data: saved, message: 'Certificador actualizado exitosamente' };
  }

  /**
   * Elimina al certificador. Si no validó ninguna inspección se borra de verdad; si ya figura en el
   * historial se saca del registro (no vuelve a mostrarse ni a ofrecerse) pero se conserva su nombre
   * en esas inspecciones.
   */
  async remove(id: number) {
    const item = await this.certificadorRepository.findOne({
      where: { id },
      relations: ['certificaciones'],
    });
    if (!item) {
      throw new NotFoundException(`Certificador #${id} no encontrado`);
    }
    const usos = item.certificaciones?.length ?? 0;
    if (usos === 0) {
      await this.certificadorRepository.delete(id);
      return { data: { conservado: false, usos: 0 }, message: 'Certificador eliminado' };
    }
    item.activo = false;
    await this.certificadorRepository.save(item);
    return {
      data: { conservado: true, usos },
      message: `Certificador eliminado. Su nombre se conserva en ${usos} inspección(es) del historial.`,
    };
  }

  /**
   * Fusiona `origenId` en `destinoId`: las inspecciones pasan al certificador destino y el de
   * origen queda inactivo.
   */
  async fusionar(origenId: number, destinoId: number) {
    if (origenId === destinoId) {
      throw new BadRequestException('Elige un certificador distinto como destino de la fusión');
    }
    const origen = await this.findOneOrFail(origenId);
    const destino = await this.findOneOrFail(destinoId);

    const inspecciones = await this.certificacionesService.reasignarCertificador(origen.id, destino.id);
    origen.activo = false;
    await this.certificadorRepository.save(origen);

    return {
      data: { inspecciones_reasignadas: inspecciones },
      message: `"${origen.nombre}" se fusionó en "${destino.nombre}" (${inspecciones} inspección(es) reasignada(s))`,
    };
  }
}
