import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instalacion } from './entities/instalacion.entity';
import { Local } from '../establecimientos/entities/local.entity';
import { CreateInstalacionDto } from './dto/create-instalacion.dto';

@Injectable()
export class InstalacionesService {
  constructor(
    @InjectRepository(Instalacion)
    private instalacionRepository: Repository<Instalacion>,
    @InjectRepository(Local)
    private localRepository: Repository<Local>,
  ) {}

  async findByLocal(localId: number) {
    const local = await this.localRepository.findOne({ where: { id: localId } });
    if (!local) {
      throw new NotFoundException(`Local #${localId} no encontrado`);
    }

    const items = await this.instalacionRepository.find({
      where: { local_id: localId },
      order: { id: 'ASC' },
    });

    return { data: items, message: 'OK' };
  }

  async create(localId: number, dto: CreateInstalacionDto) {
    const local = await this.localRepository.findOne({ where: { id: localId } });
    if (!local) {
      throw new NotFoundException(`Local #${localId} no encontrado`);
    }

    const item = this.instalacionRepository.create({
      ...dto,
      local_id: localId,
    });
    const saved = await this.instalacionRepository.save(item);
    return { data: saved, message: 'Instalación creada exitosamente' };
  }

  async update(id: number, dto: Partial<CreateInstalacionDto>) {
    const item = await this.instalacionRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Instalación #${id} no encontrada`);
    }
    Object.assign(item, dto);
    const saved = await this.instalacionRepository.save(item);
    return { data: saved, message: 'Instalación actualizada exitosamente' };
  }

  async delete(id: number) {
    const item = await this.instalacionRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Instalación #${id} no encontrada`);
    }
    await this.instalacionRepository.remove(item);
    return { data: null, message: 'Instalación eliminada exitosamente' };
  }
}
