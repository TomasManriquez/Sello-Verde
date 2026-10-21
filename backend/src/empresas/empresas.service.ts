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
import { Empresa } from './entities/empresa.entity';
import { CreateEmpresaDto, UpdateEmpresaDto } from './dto/empresa.dto';
import { ExpedientesService } from '../expedientes/expedientes.service';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa)
    private empresaRepository: Repository<Empresa>,
    @Inject(forwardRef(() => ExpedientesService))
    private expedientesService: ExpedientesService,
  ) {}

  /** Lista con los establecimientos que atiende cada empresa (según sus expedientes vigentes). */
  async findAll(filters?: { q?: string; activa?: boolean }) {
    const items = await this.empresaRepository.find({
      relations: ['expedientes', 'expedientes.establecimiento'],
      order: { razon_social: 'ASC' },
    });

    // Por defecto solo las vigentes: una empresa eliminada no vuelve a mostrarse
    const q = filters?.q?.trim().toLowerCase();
    const data = items
      .filter((e) => e.activa === (filters?.activa ?? true))
      .filter(
        (e) =>
          !q ||
          e.razon_social.toLowerCase().includes(q) ||
          (e.rut ?? '').toLowerCase().includes(q) ||
          (e.contacto ?? '').toLowerCase().includes(q),
      )
      .map(({ expedientes, ...empresa }) => ({
        ...empresa,
        establecimientos: (expedientes ?? [])
          .filter((x) => x.establecimiento)
          .map((x) => ({ id: x.establecimiento.id, nombre: x.establecimiento.nombre })),
      }));

    return { data, message: 'OK', total: data.length };
  }

  /** Uso interno: valida que exista (para expedientes) */
  async findOneOrFail(id: number): Promise<Empresa> {
    const item = await this.empresaRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Empresa #${id} no encontrada`);
    }
    return item;
  }

  /**
   * El RUT es único. Si lo tiene una empresa vigente falla; si lo tiene una eliminada (oculta,
   * conservada solo por el historial) se le quita el RUT para liberarlo.
   */
  private async validarRutLibre(rut: string | null | undefined, exceptoId?: number) {
    if (!rut) return;
    const existente = await this.empresaRepository.findOne({ where: { rut } });
    if (!existente || existente.id === exceptoId) return;
    if (existente.activa) {
      throw new ConflictException(
        `Ya existe una empresa con el RUT ${rut}: ${existente.razon_social}`,
      );
    }
    existente.rut = null;
    await this.empresaRepository.save(existente);
  }

  async create(dto: CreateEmpresaDto) {
    // Volver a crear una empresa eliminada (mismo RUT) la reincorpora con los datos nuevos
    if (dto.rut) {
      const eliminada = await this.empresaRepository.findOne({ where: { rut: dto.rut, activa: false } });
      if (eliminada) {
        Object.assign(eliminada, {
          razon_social: dto.razon_social,
          contacto: dto.contacto ?? null,
          telefono: dto.telefono ?? null,
          email: dto.email ?? null,
          activa: true,
        });
        const saved = await this.empresaRepository.save(eliminada);
        return { data: saved, message: 'Empresa creada exitosamente' };
      }
    }
    await this.validarRutLibre(dto.rut);
    const saved = await this.empresaRepository.save(this.empresaRepository.create(dto));
    return { data: saved, message: 'Empresa creada exitosamente' };
  }

  async update(id: number, dto: UpdateEmpresaDto) {
    const item = await this.findOneOrFail(id);
    if (dto.rut !== undefined) await this.validarRutLibre(dto.rut, id);
    Object.assign(item, dto);
    const saved = await this.empresaRepository.save(item);
    return { data: saved, message: 'Empresa actualizada exitosamente' };
  }

  /**
   * Elimina la empresa. Si no la usa ningún expediente se borra de verdad; si ya está en el historial
   * de algún establecimiento se saca del registro (no vuelve a mostrarse ni a ofrecerse), pero se
   * conserva su nombre en ese historial.
   */
  async remove(id: number) {
    const item = await this.empresaRepository.findOne({
      where: { id },
      relations: ['expedientes'],
      withDeleted: true, // cuenta también expedientes eliminados lógicamente: la FK los sigue apuntando
    });
    if (!item) {
      throw new NotFoundException(`Empresa #${id} no encontrada`);
    }
    const usos = item.expedientes?.length ?? 0;
    if (usos === 0) {
      await this.empresaRepository.delete(id);
      return { data: { conservada: false, usos: 0 }, message: 'Empresa eliminada' };
    }
    item.activa = false;
    await this.empresaRepository.save(item);
    return {
      data: { conservada: true, usos },
      message: `Empresa eliminada. Su nombre se conserva en el historial de ${usos} establecimiento(s).`,
    };
  }

  /**
   * Fusiona `origenId` en `destinoId`: los expedientes pasan a la empresa destino y la de origen
   * queda inactiva (no se elimina, para no perder rastro de la fusión).
   */
  async fusionar(origenId: number, destinoId: number) {
    if (origenId === destinoId) {
      throw new BadRequestException('Elige una empresa distinta como destino de la fusión');
    }
    const origen = await this.findOneOrFail(origenId);
    const destino = await this.findOneOrFail(destinoId);

    const expedientes = await this.expedientesService.reasignarEmpresa(origen.id, destino.id);
    origen.activa = false;
    await this.empresaRepository.save(origen);

    return {
      data: { expedientes_reasignados: expedientes },
      message: `"${origen.razon_social}" se fusionó en "${destino.razon_social}" (${expedientes} expediente(s) reasignado(s))`,
    };
  }
}
