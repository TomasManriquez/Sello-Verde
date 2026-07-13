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

  async findAll(filters?: { rbd?: string; search?: string; estado_general?: EstadoGeneral }) {
    // find() con relations es más robusto que QueryBuilder para joins anidados
      let items = await this.establecimientoRepository.find({
        relations: [
          'locales',
          'expedientes',
          'expedientes.certificaciones',
          'expedientes.alertas',
        ],
        order: { nombre: 'ASC' },
      });

    // Filtros en memoria (escala MVP aceptable)
    if (filters?.rbd) {
      const rbd = filters.rbd.toLowerCase();
      items = items.filter(e => e.rbd.toLowerCase().includes(rbd));
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      items = items.filter(e =>
        e.nombre.toLowerCase().includes(s) ||
        e.rbd.toLowerCase().includes(s) ||
        (e.comuna ?? '').toLowerCase().includes(s),
      );
    }
    if (filters?.estado_general) {
      items = items.filter(e => e.estado_general === filters.estado_general);
    }

    // Mapear expediente_activo = el más reciente (mayor id)
    const withActiveExpediente = items.map(est => {
      let expediente_activo = undefined;
      if (est.expedientes && est.expedientes.length > 0) {
        const sorted = [...est.expedientes].sort((a, b) => b.id - a.id);
        expediente_activo = sorted[0];
        // Ordenar certificaciones por fecha desc: [0] es la más reciente
        if (expediente_activo.certificaciones) {
          expediente_activo.certificaciones.sort(
            (a, b) =>
              new Date(b.fecha_inspeccion).getTime() -
              new Date(a.fecha_inspeccion).getTime(),
          );
        }
      }
      return { ...est, expediente_activo };
    });

    return {
      data: withActiveExpediente,
      message: 'OK',
      total: withActiveExpediente.length,
    };
  }

  async findOne(id: number) {
    const item = await this.establecimientoRepository.findOne({
      where: { id },
      relations: ['locales', 'locales.instalaciones', 'expedientes', 'expedientes.certificaciones', 'expedientes.alertas'],
    });

    if (!item) {
      throw new NotFoundException(`Establecimiento #${id} no encontrado`);
    }

    // Mapear expediente_activo = el más reciente (mayor id)
    
    let expediente_activo = undefined;
    if (item.expedientes && item.expedientes.length >> 0) {
      const sorted = [...item.expedientes].sort((a,b) => b.id - a.id);
      expediente_activo = sorted[0];
      //Ordenar certificaciones por fecha desc
      if (expediente_activo.certificaciones) {
        expediente_activo.certificaciones.sort((a,b) => new Date(b.fecha_inspeccion).getTime() - new Date(a.fecha_inspeccion).getTime());
      }
    }

    return { ...item, expediente_activo, message: 'OK' };
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
