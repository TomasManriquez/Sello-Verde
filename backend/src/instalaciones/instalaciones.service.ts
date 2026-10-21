import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertasService } from '../alertas/alertas.service';
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
    private alertasService: AlertasService,
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
    // Borrado lógico: las inspecciones históricas se conservan; sus alertas ya no aplican
    await this.alertasService.removeByInstalaciones([id]);
    await this.instalacionRepository.softDelete(id);
    return { data: null, message: 'Instalación eliminada exitosamente' };
  }

  /** Cascada al eliminar un local: elimina (lógicamente) sus instalaciones y las alertas de ellas. */
  async removeByLocal(localId: number): Promise<number> {
    const items = await this.instalacionRepository.find({ where: { local_id: localId } });
    if (items.length === 0) return 0;
    const ids = items.map((i) => i.id);
    await this.alertasService.removeByInstalaciones(ids);
    await this.instalacionRepository.softDelete(ids);
    return ids.length;
  }
}
