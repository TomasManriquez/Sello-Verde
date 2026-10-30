import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Alerta } from './entities/alerta.entity';

/**
 * Los vencimientos que ve el usuario se derivan del sello de cada instalación
 * (ver `common/vencimientos.util.ts`); esta tabla ya no se lee ni se escribe desde la
 * interfaz. Se conserva solo el mantenimiento de las filas históricas.
 */
@Injectable()
export class AlertasService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AlertasService.name);

  constructor(
    @InjectRepository(Alerta)
    private alertaRepository: Repository<Alerta>,
  ) {}

  /** Al arrancar, limpia alertas que quedaron colgando de expedientes, establecimientos o instalaciones eliminados. */
  async onApplicationBootstrap() {
    await this.limpiarHuerfanas();
  }

  async limpiarHuerfanas() {
    const res = await this.alertaRepository
      .createQueryBuilder()
      .softDelete()
      .where('deleted_at IS NULL')
      .andWhere(
        `(expediente_id IN (
            SELECT e.id FROM expedientes e
            LEFT JOIN establecimientos s ON s.id = e.establecimiento_id
            WHERE e.deleted_at IS NOT NULL OR s.deleted_at IS NOT NULL
          )
          OR instalacion_id IN (SELECT i.id FROM instalaciones i WHERE i.deleted_at IS NOT NULL))`,
      )
      .execute();
    if (res.affected) {
      this.logger.log(`Alertas huérfanas eliminadas (soft-delete): ${res.affected}`);
    }
    return res.affected ?? 0;
  }

  /** Cascada al eliminar instalaciones: sus alertas dejan de tener sentido. */
  async removeByInstalaciones(instalacionIds: number[]) {
    if (!instalacionIds || instalacionIds.length === 0) return;
    await this.alertaRepository.softDelete({ instalacion_id: In(instalacionIds) });
  }
}
