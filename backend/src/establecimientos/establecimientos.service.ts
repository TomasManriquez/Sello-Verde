import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Establecimiento } from './entities/establecimiento.entity';
import { Local } from './entities/local.entity';
import { CreateEstablecimientoDto } from './dto/create-establecimiento.dto';
import { CreateLocalDto } from './dto/create-local.dto';
import { EstadoGeneral } from '../common/enums';

@Injectable()
export class EstablecimientosService {
  constructor(
    @InjectRepository(Establecimiento)
    private establecimientoRepository: Repository<Establecimiento>,
    @InjectRepository(Local)
    private localRepository: Repository<Local>,
  ) {}

  async findAll(filters?: { rbd?: string; estado_general?: EstadoGeneral }) {
    const qb = this.establecimientoRepository
      .createQueryBuilder('est')
      .leftJoinAndSelect('est.locales', 'locales')
      .leftJoin('est.expedientes', 'expediente')
      .addSelect(['expediente.id', 'expediente.estado_general', 'expediente.estado_tc6'])
      .orderBy('est.nombre', 'ASC');

    if (filters?.rbd) {
      qb.andWhere('est.rbd ILIKE :rbd', { rbd: `%${filters.rbd}%` });
    }

    if (filters?.estado_general) {
      qb.andWhere('est.estado_general = :estado', {
        estado: filters.estado_general,
      });
    }

    const items = await qb.getMany();

    return {
      data: items,
      message: 'OK',
      total: items.length,
    };
  }

  async findOne(id: number) {
    const item = await this.establecimientoRepository.findOne({
      where: { id },
      relations: ['locales', 'locales.instalaciones', 'expedientes'],
    });

    if (!item) {
      throw new NotFoundException(`Establecimiento #${id} no encontrado`);
    }

    return { data: item, message: 'OK' };
  }

  async create(dto: CreateEstablecimientoDto) {
    const item = this.establecimientoRepository.create(dto);
    const saved = await this.establecimientoRepository.save(item);
    return { data: saved, message: 'Establecimiento creado exitosamente' };
  }

  async update(id: number, dto: Partial<CreateEstablecimientoDto>) {
    const item = await this.establecimientoRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Establecimiento #${id} no encontrado`);
    }
    Object.assign(item, dto);
    const saved = await this.establecimientoRepository.save(item);
    return { data: saved, message: 'Establecimiento actualizado exitosamente' };
  }

  // --- LOCALES ---

  async findLocales(establecimientoId: number) {
    const establecimiento = await this.establecimientoRepository.findOne({
      where: { id: establecimientoId },
    });
    if (!establecimiento) {
      throw new NotFoundException(`Establecimiento #${establecimientoId} no encontrado`);
    }

    const locales = await this.localRepository.find({
      where: { establecimiento_id: establecimientoId },
      relations: ['instalaciones'],
      order: { numero_local: 'ASC' },
    });

    return { data: locales, message: 'OK' };
  }

  async createLocal(establecimientoId: number, dto: CreateLocalDto) {
    const establecimiento = await this.establecimientoRepository.findOne({
      where: { id: establecimientoId },
    });
    if (!establecimiento) {
      throw new NotFoundException(`Establecimiento #${establecimientoId} no encontrado`);
    }

    const local = this.localRepository.create({
      ...dto,
      establecimiento_id: establecimientoId,
    });
    const saved = await this.localRepository.save(local);
    return { data: saved, message: 'Local creado exitosamente' };
  }



  async updateLocal(localId: number, dto: Partial<CreateLocalDto>) {
    const local = await this.localRepository.findOne({ where: { id: localId } });
    if (!local) {
      throw new NotFoundException(`Local #${localId} no encontrado`);
    }
    Object.assign(local, dto);
    const saved = await this.localRepository.save(local);
    return { data: saved, message: 'Local actualizado exitosamente' };
  }
}
