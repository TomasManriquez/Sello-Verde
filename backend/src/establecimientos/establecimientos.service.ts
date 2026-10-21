import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Establecimiento } from './entities/establecimiento.entity';
import { Local } from './entities/local.entity';
import { CreateEstablecimientoDto } from './dto/create-establecimiento.dto';
import { CreateLocalDto } from './dto/create-local.dto';
import { EstadoGeneral, EstadoTC6, TipoDefecto } from '../common/enums';
import { construirExcel, FilaExport } from './export-excel';
import { ExpedientesService } from '../expedientes/expedientes.service';
import { InstalacionesService } from '../instalaciones/instalaciones.service';
import {
  calcularSellos,
  derivarEstadoGeneral,
  expedienteActivo,
  resumirSellos,
} from '../common/sellos.util';

const ETIQUETA_ESTADO: Record<string, string> = {
  sin_gestion: 'Sin gestión',
  en_levantamiento: 'En levantamiento',
  en_proyecto: 'En proyecto TC6',
  en_regularizacion: 'Obras / Regularización',
  en_certificacion: 'Obras / Regularización',
  sello_verde: 'Sello verde',
  sello_amarillo: 'Sello amarillo',
  sello_rojo: 'Sello rojo',
};

const ETIQUETA_TC6: Record<EstadoTC6, string> = {
  [EstadoTC6.SIN_INICIAR]: 'Sin iniciar',
  [EstadoTC6.EN_ELABORACION]: 'En elaboración',
  [EstadoTC6.INGRESADO_SEC]: 'Ingresado a la SEC',
  [EstadoTC6.OBSERVADO]: 'Observado',
  [EstadoTC6.TC6_APROBADO]: 'TC6 aprobado',
};

const ETIQUETA_SELLO: Record<string, string> = {
  sin_inspeccion: 'Sin inspección',
  verde: 'Verde',
  verde_vencido: 'Verde vencido',
  amarillo: 'Amarillo',
  rojo: 'Rojo',
};

const ETIQUETA_DEFECTO: Record<TipoDefecto, string> = {
  [TipoDefecto.FUGAS_ARTEFACTOS]: 'Fugas de gas en artefactos',
  [TipoDefecto.FUGAS_RED]: 'Fugas de gas en la red',
  [TipoDefecto.FUGAS_MEDIDOR]: 'Fugas de gas en el medidor',
  [TipoDefecto.SIN_CONDUCTO_EVACUACION]: 'Artefactos tipo B o C sin conducto de evacuación',
  [TipoDefecto.CO_SUPERIOR_50PPM]: 'CO ambiente superior a 50 ppm',
  [TipoDefecto.ARTEFACTO_A_EN_AULAS]: 'Artefacto tipo A en salas de clases o bibliotecas',
  [TipoDefecto.LECTURA_TIRO_IGUAL]: 'Lectura de tiro igual a 0 o negativo',
};

/** Los decimales de Postgres llegan como texto */
function aNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** 'YYYY-MM-DD' → Date a medianoche local (Excel la muestra con formato de fecha) */
function aFecha(valor?: string | null): Date | null {
  const m = valor ? /^(\d{4})-(\d{2})-(\d{2})/.exec(valor) : null;
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

@Injectable()
export class EstablecimientosService {
  constructor(
    @InjectRepository(Establecimiento)
    private establecimientoRepository: Repository<Establecimiento>,
    @InjectRepository(Local)
    private localRepository: Repository<Local>,
    private expedientesService: ExpedientesService,
    private instalacionesService: InstalacionesService,
  ) {}

  /**
   * Agrega los datos derivados de una ficha de establecimiento:
   *  - `expediente_activo`: el de mayor id, con certificaciones por fecha desc
   *  - `sello` en cada instalación (última inspección aplicable)
   *  - `estado_general`: calculado desde las instalaciones (el peor sello manda)
   */
  private enriquecer(est: Establecimiento) {
    const expediente_activo = expedienteActivo(est.expedientes);
    // Ordenar certificaciones por fecha desc: [0] es la más reciente
    if (expediente_activo?.certificaciones) {
      expediente_activo.certificaciones.sort(
        (a, b) =>
          new Date(b.fecha_inspeccion).getTime() - new Date(a.fecha_inspeccion).getTime(),
      );
    }

    const sellos = calcularSellos(
      est.locales,
      expediente_activo?.certificaciones,
      expediente_activo?.alertas,
    );
    const estado_general = derivarEstadoGeneral({
      expediente: expediente_activo,
      sellos,
      certificaciones: expediente_activo?.certificaciones,
      locales: est.locales,
    });

    const locales = (est.locales ?? []).map((local) => ({
      ...local,
      instalaciones: (local.instalaciones ?? []).map((inst) => ({
        ...inst,
        sello: sellos.find((s) => s.instalacion_id === inst.id) ?? null,
      })),
    }));

    return {
      ...est,
      locales,
      estado_general,
      expediente_activo: expediente_activo ? { ...expediente_activo, estado_general } : undefined,
      resumen_sellos: resumirSellos(sellos),
    };
  }

  async findAll(filters?: { rbd?: string; search?: string; estado_general?: EstadoGeneral }) {
    // find() con relations es más robusto que QueryBuilder para joins anidados
    const items = await this.establecimientoRepository.find({
      relations: [
        'locales',
        'locales.instalaciones',
        'expedientes',
        'expedientes.certificaciones',
        'expedientes.alertas',
      ],
      order: { nombre: 'ASC' },
    });

    // El estado se deriva de las instalaciones; el filtro por estado va después de derivarlo
    let enriched = items.map((e) => this.enriquecer(e));

    // Filtros en memoria (escala MVP aceptable)
    if (filters?.rbd) {
      const rbd = filters.rbd.toLowerCase();
      enriched = enriched.filter((e) => e.rbd.toLowerCase().includes(rbd));
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      enriched = enriched.filter(
        (e) =>
          e.nombre.toLowerCase().includes(s) ||
          e.rbd.toLowerCase().includes(s) ||
          (e.comuna ?? '').toLowerCase().includes(s),
      );
    }
    if (filters?.estado_general) {
      // `en_certificacion` es el nombre legado de `en_regularizacion`
      const buscado =
        filters.estado_general === EstadoGeneral.EN_CERTIFICACION
          ? EstadoGeneral.EN_REGULARIZACION
          : filters.estado_general;
      enriched = enriched.filter((e) => e.estado_general === buscado);
    }

    return {
      data: enriched,
      message: 'OK',
      total: enriched.length,
    };
  }

  /**
   * Reporte Excel de una sola hoja. Una fila por instalación; el establecimiento se repite.
   * Locales sin instalaciones (o sin gas) y establecimientos sin locales salen en una fila
   * con las columnas de instalación vacías.
   */
  async exportarExcel(ids: number[]): Promise<Buffer> {
    const items = await this.establecimientoRepository.find({
      where: { id: In(ids) },
      relations: [
        'locales',
        'locales.instalaciones',
        'expedientes',
        'expedientes.certificaciones',
        'expedientes.certificaciones.defectos',
        'expedientes.alertas',
      ],
      order: { nombre: 'ASC' },
    });
    if (items.length === 0) {
      throw new NotFoundException('No se encontraron establecimientos para exportar');
    }

    const filas: FilaExport[] = [];
    for (const est of items) {
      const e = this.enriquecer(est);
      const exp = e.expediente_activo;
      const pendientes = (exp?.alertas ?? []).filter((a) => a.estado !== 'resuelta');

      const base: FilaExport = {
        rbd: e.rbd,
        nombre: e.nombre,
        direccion: e.direccion ?? null,
        comuna: e.comuna ?? null,
        propietario: e.nombre_propietario ?? null,
        estado: ETIQUETA_ESTADO[e.estado_general] ?? e.estado_general,
        cantidad_locales: e.locales.length,
        contratista: exp?.empresa_instaladora ?? null,
        rut_contratista: exp?.rut_empresa ?? null,
        licitacion: exp?.numero_licitacion ?? null,
        tc6: exp ? ETIQUETA_TC6[exp.estado_tc6] ?? exp.estado_tc6 : null,
        presupuesto: aNumero(exp?.monto_presupuesto),
        ejecutado: aNumero(exp?.monto_ejecutado),
      };

      if (e.locales.length === 0) {
        filas.push(base);
        continue;
      }

      const locales = [...e.locales].sort((a, b) => a.numero_local - b.numero_local);
      for (const local of locales) {
        const filaLocal: FilaExport = {
          ...base,
          numero_local: local.numero_local,
          nombre_local: local.nombre ?? null,
          direccion_local: local.direccion ?? null,
          usa_gas: local.usa_gas ? 'Sí' : 'No',
        };
        const instalaciones = local.usa_gas ? local.instalaciones : [];
        if (instalaciones.length === 0) {
          filas.push(filaLocal);
          continue;
        }
        for (const inst of instalaciones) {
          const sello = inst.sello;
          const cert = sello?.certificacion_id
            ? exp?.certificaciones?.find((c) => c.id === sello.certificacion_id)
            : undefined;
          filas.push({
            ...filaLocal,
            tipo_gas: inst.tipo_gas ?? null,
            abastecimiento: inst.abastecimiento ?? null,
            zona: inst.zona_abastecimiento ?? null,
            referencia: inst.referencia ?? null,
            artefacto: inst.artefacto_cilindro ?? null,
            sello: sello ? ETIQUETA_SELLO[sello.estado_sello] : null,
            fecha_inspeccion: aFecha(sello?.fecha_inspeccion),
            fecha_limite: aFecha(sello?.fecha_limite),
            dias_restantes: sello?.dias_restantes ?? null,
            inspector: cert?.nombre_inspector ?? null,
            entidad: cert?.entidad_certificadora ?? null,
            numero_certificado: cert?.numero_certificado ?? null,
            defectos: cert?.defectos?.length
              ? cert.defectos
                  .map((d) => ETIQUETA_DEFECTO[d.tipo_defecto] + (d.instalacion_afectada ? ` (${d.instalacion_afectada})` : ''))
                  .join('; ')
              : null,
            alertas_pendientes: pendientes.filter((a) => a.instalacion_id === inst.id).length,
          });
        }
      }
    }

    return construirExcel(filas);
  }

  async findOne(id: number) {
    const item = await this.establecimientoRepository.findOne({
      where: { id },
      relations: ['locales', 'locales.instalaciones', 'expedientes', 'expedientes.certificaciones', 'expedientes.alertas'],
    });

    if (!item) {
      throw new NotFoundException(`Establecimiento #${id} no encontrado`);
    }

    return { ...this.enriquecer(item), message: 'OK' };
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

  /**
   * Elimina un local con todas sus instalaciones (borrado lógico).
   * Las inspecciones históricas se conservan; las alertas de sus instalaciones se eliminan.
   */
  async removeLocal(localId: number) {
    const local = await this.localRepository.findOne({ where: { id: localId } });
    if (!local) {
      throw new NotFoundException(`Local #${localId} no encontrado`);
    }
    const instalaciones = await this.instalacionesService.removeByLocal(localId);
    await this.localRepository.softDelete(localId);
    return {
      data: { instalaciones_eliminadas: instalaciones },
      message:
        instalaciones > 0
          ? `Local eliminado junto con ${instalaciones} instalación(es)`
          : 'Local eliminado',
    };
  }

  /**
   * Soft-delete de establecimiento con delegación de responsabilidades:
   * 1. Delega a ExpedientesService la eliminación de los expedientes asociados y sus alertas
   * 2. Soft-delete del propio establecimiento
   */
  async remove(id: number) {
    const item = await this.establecimientoRepository.findOne({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`Establecimiento #${id} no encontrado`);
    }

    // 1. Delegar a ExpedientesService (él conoce sus reglas de negocio y alertas)
    await this.expedientesService.removeByEstablecimiento(id);

    // 2. Locales (y sus instalaciones)
    const locales = await this.localRepository.find({ where: { establecimiento_id: id } });
    for (const local of locales) {
      await this.instalacionesService.removeByLocal(local.id);
    }
    if (locales.length > 0) {
      await this.localRepository.softDelete(locales.map((l) => l.id));
    }

    // 3. Soft-delete del establecimiento
    await this.establecimientoRepository.softDelete(id);
    return { message: 'Establecimiento y recursos asociados eliminados exitosamente' };
  }
}
