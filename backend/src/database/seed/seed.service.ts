import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../../auth/entities/usuario.entity';
import { Establecimiento } from '../../establecimientos/entities/establecimiento.entity';
import { Local } from '../../establecimientos/entities/local.entity';
import { Instalacion } from '../../instalaciones/entities/instalacion.entity';
import { Expediente } from '../../expedientes/entities/expediente.entity';
import { Certificacion } from '../../certificaciones/entities/certificacion.entity';
import { Defecto } from '../../certificaciones/entities/defecto.entity';
import { Alerta } from '../../alertas/entities/alerta.entity';
import {
  EstadoGeneral,
  EstadoTC6,
  TipoSello,
  TipoGas,
  Abastecimiento,
  ZonaAbastecimiento,
  TipoAlerta,
  EstadoAlerta,
  TipoDefecto,
} from '../../common/enums';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Usuario)
    private usuarioRepo: Repository<Usuario>,
    @InjectRepository(Establecimiento)
    private establecimientoRepo: Repository<Establecimiento>,
    @InjectRepository(Local)
    private localRepo: Repository<Local>,
    @InjectRepository(Instalacion)
    private instalacionRepo: Repository<Instalacion>,
    @InjectRepository(Expediente)
    private expedienteRepo: Repository<Expediente>,
    @InjectRepository(Certificacion)
    private certificacionRepo: Repository<Certificacion>,
    @InjectRepository(Defecto)
    private defectoRepo: Repository<Defecto>,
    @InjectRepository(Alerta)
    private alertaRepo: Repository<Alerta>,
  ) { }

  async onApplicationBootstrap() {
    const count = await this.usuarioRepo.count();
    if (count > 0) {
      this.logger.log('Database already seeded, skipping...');
      return;
    }

    this.logger.log('🌱 Seeding database with initial data...');
    await this.seed();
    this.logger.log('✅ Database seeded successfully!');
  }

  private async seed() {
    // ========================
    // 1. ADMIN USER
    // ========================
    const passwordHash = await bcrypt.hash('slep2024', 10);
    const admin = await this.usuarioRepo.save(
      this.usuarioRepo.create({
        nombre: 'Administrador SLEP',
        email: 'admin@slep.cl',
        password_hash: passwordHash,
        rol: 'admin',
        activo: true,
      }),
    );
    this.logger.log(`Created admin user: ${admin.email}`);

    // ========================
    // 2. ESTABLECIMIENTOS
    // ========================

    // ---- SELLO VERDE GROUP ----
    // Escuela Bernardo Philippi
    const philippi = await this.establecimientoRepo.save(
      this.establecimientoRepo.create({
        rbd: '7976-6',
        nombre: 'Escuela Bernardo Philippi',
        direccion: 'Avenida Philippi 563',
        nombre_propietario: 'SLEP Llanquihue',
        comuna: 'Frutillar',
        region: 'Los Lagos',
        estado_general: EstadoGeneral.SELLO_VERDE,
        cantidad_locales: 1,
      }),
    );

    // Liceo Industrial Chileno Alemán (LICHAF)
    const lichaf = await this.establecimientoRepo.save(
      this.establecimientoRepo.create({
        rbd: '7973-1',
        nombre: 'Liceo Industrial Chileno Alemán (LICHAF)',
        direccion: 'Avenida Alemania 400',
        nombre_propietario: 'SLEP Llanquihue',
        comuna: 'Frutillar',
        region: 'Los Lagos',
        estado_general: EstadoGeneral.SELLO_VERDE,
        cantidad_locales: 1,
      }),
    );

    // Instituto Alemán de Frutillar
    const institutoAleman = await this.establecimientoRepo.save(
      this.establecimientoRepo.create({
        rbd: '8000-4',
        nombre: 'Instituto Alemán de Frutillar',
        direccion: 'Avenida Philippi 231',
        nombre_propietario: 'SLEP Llanquihue',
        comuna: 'Frutillar',
        region: 'Los Lagos',
        estado_general: EstadoGeneral.SELLO_VERDE,
        cantidad_locales: 1,
      }),
    );

    // ---- EN_PROYECTO GROUP ----
    // Escuela Arturo Alessandri Palma
    const alessandri = await this.establecimientoRepo.save(
      this.establecimientoRepo.create({
        rbd: '7975-8',
        nombre: 'Escuela Arturo Alessandri Palma',
        direccion: 'Avenida Alessandri 286',
        nombre_propietario: 'SLEP Llanquihue',
        comuna: 'Frutillar',
        region: 'Los Lagos',
        estado_general: EstadoGeneral.EN_PROYECTO,
        cantidad_locales: 1,
      }),
    );

    // Escuela Claudio Matte
    const claudioMatte = await this.establecimientoRepo.save(
      this.establecimientoRepo.create({
        rbd: '11548-7',
        nombre: 'Escuela Claudio Matte',
        direccion: 'Calle Violeta Parra 207',
        nombre_propietario: 'SLEP Llanquihue',
        comuna: 'Frutillar',
        region: 'Los Lagos',
        estado_general: EstadoGeneral.EN_PROYECTO,
        cantidad_locales: 1,
      }),
    );

    // ---- SELLO ROJO ----
    // Green College (6 locales)
    const greenCollege = await this.establecimientoRepo.save(
      this.establecimientoRepo.create({
        rbd: '225460',
        nombre: 'Green College',
        direccion: 'Calle Carlos Richter 560',
        nombre_propietario: 'SLEP Llanquihue',
        comuna: 'Frutillar',
        region: 'Los Lagos',
        estado_general: EstadoGeneral.SELLO_ROJO,
        cantidad_locales: 6,
      }),
    );

    // ---- SELLO AMARILLO ----
    // Colegio Montessori Frutillar
    const montessori = await this.establecimientoRepo.save(
      this.establecimientoRepo.create({
        rbd: '41921',
        nombre: 'Colegio Montessori Frutillar',
        direccion: 'Parcela 11, Jardines de Frutillar',
        nombre_propietario: 'SLEP Llanquihue',
        comuna: 'Frutillar',
        region: 'Los Lagos',
        estado_general: EstadoGeneral.SELLO_AMARILLO,
        cantidad_locales: 1,
      }),
    );

    // Escuela Rural Los Linares de Casma
    const losLinares = await this.establecimientoRepo.save(
      this.establecimientoRepo.create({
        rbd: '7977-4',
        nombre: 'Escuela Rural Los Linares de Casma',
        direccion: 'Calle Roberto Simpson 130, Casma',
        nombre_propietario: 'SLEP Llanquihue',
        comuna: 'Frutillar',
        region: 'Los Lagos',
        estado_general: EstadoGeneral.SELLO_AMARILLO,
        cantidad_locales: 1,
      }),
    );

    // ---- EN_LEVANTAMIENTO ----
    // Escuela Rural Mario Pérez Navarro
    const marioPérez = await this.establecimientoRepo.save(
      this.establecimientoRepo.create({
        rbd: '7978-2',
        nombre: 'Escuela Rural Mario Pérez Navarro',
        direccion: 'Sector Los Bajos, Kilómetro 14',
        nombre_propietario: 'SLEP Llanquihue',
        comuna: 'Frutillar',
        region: 'Los Lagos',
        estado_general: EstadoGeneral.EN_LEVANTAMIENTO,
        cantidad_locales: 1,
      }),
    );

    // Escuela Rural Paraguay
    const paraguay = await this.establecimientoRepo.save(
      this.establecimientoRepo.create({
        rbd: '7982-0',
        nombre: 'Escuela Rural Paraguay',
        direccion: 'Sector Rural Paraguay',
        nombre_propietario: 'SLEP Llanquihue',
        comuna: 'Frutillar',
        region: 'Los Lagos',
        estado_general: EstadoGeneral.EN_LEVANTAMIENTO,
        cantidad_locales: 1,
      }),
    );

    // ---- SIN_GESTION ----
    // Escuela Rural Colonia San Martín
    const coloniaSanMartin = await this.establecimientoRepo.save(
      this.establecimientoRepo.create({
        rbd: '7990-1',
        nombre: 'Escuela Rural Colonia San Martín',
        direccion: 'Sector Colonia San Martín',
        nombre_propietario: 'SLEP Llanquihue',
        comuna: 'Frutillar',
        region: 'Los Lagos',
        estado_general: EstadoGeneral.SIN_GESTION,
        cantidad_locales: 1,
      }),
    );

    // Escuela Carlos Springer Niklitschek
    const carlosSpringer = await this.establecimientoRepo.save(
      this.establecimientoRepo.create({
        rbd: '7987-1',
        nombre: 'Escuela Carlos Springer Niklitschek',
        direccion: 'Sector Rural Frutillar',
        nombre_propietario: 'SLEP Llanquihue',
        comuna: 'Frutillar',
        region: 'Los Lagos',
        estado_general: EstadoGeneral.SIN_GESTION,
        cantidad_locales: 1,
      }),
    );

    // ---- EN_CERTIFICACION ----
    // Colegio Particular N° 244 Madre de Dios (5 locales)
    const madreDeDios = await this.establecimientoRepo.save(
      this.establecimientoRepo.create({
        rbd: '7989-8',
        nombre: 'Colegio Particular N° 244 Madre de Dios',
        direccion: 'Sector Rural Frutillar',
        nombre_propietario: 'SLEP Llanquihue',
        comuna: 'Frutillar',
        region: 'Los Lagos',
        estado_general: EstadoGeneral.EN_CERTIFICACION,
        cantidad_locales: 5,
      }),
    );

    this.logger.log('Created 13 establecimientos');

    // ========================
    // 3. LOCALES
    // ========================

    // Philippi - 1 local
    const localPhilippi = await this.localRepo.save(
      this.localRepo.create({
        establecimiento_id: philippi.id,
        numero_local: 1,
        nombre: 'Local Principal',
        direccion: 'Avenida Philippi 563',
        usa_gas: true,
      }),
    );

    // LICHAF - 1 local
    const localLichaf = await this.localRepo.save(
      this.localRepo.create({
        establecimiento_id: lichaf.id,
        numero_local: 1,
        nombre: 'Local Principal',
        direccion: 'Avenida Alemania 400',
        usa_gas: true,
      }),
    );

    // Instituto Alemán - 1 local
    const localInstituto = await this.localRepo.save(
      this.localRepo.create({
        establecimiento_id: institutoAleman.id,
        numero_local: 1,
        nombre: 'Local Principal',
        direccion: 'Avenida Philippi 231',
        usa_gas: true,
      }),
    );

    // Alessandri - 1 local
    const localAlessandri = await this.localRepo.save(
      this.localRepo.create({
        establecimiento_id: alessandri.id,
        numero_local: 1,
        nombre: 'Local Principal',
        direccion: 'Avenida Alessandri 286',
        usa_gas: true,
      }),
    );

    // Claudio Matte - 1 local
    const localClaudioMatte = await this.localRepo.save(
      this.localRepo.create({
        establecimiento_id: claudioMatte.id,
        numero_local: 1,
        nombre: 'Local Principal',
        direccion: 'Calle Violeta Parra 207',
        usa_gas: true,
      }),
    );

    // Green College - 6 locales
    const localesGreenCollege = await this.localRepo.save([
      this.localRepo.create({
        establecimiento_id: greenCollege.id,
        numero_local: 1,
        nombre: 'Sede Central',
        direccion: 'Calle Carlos Richter 560',
        usa_gas: true,
      }),
      this.localRepo.create({
        establecimiento_id: greenCollege.id,
        numero_local: 2,
        nombre: 'Sede Norte',
        direccion: 'Calle Carlos Richter 562',
        usa_gas: true,
      }),
      this.localRepo.create({
        establecimiento_id: greenCollege.id,
        numero_local: 3,
        nombre: 'Sede Sur',
        direccion: 'Calle Carlos Richter 564',
        usa_gas: false,
      }),
      this.localRepo.create({
        establecimiento_id: greenCollege.id,
        numero_local: 4,
        nombre: 'Gimnasio',
        direccion: 'Calle Carlos Richter 566',
        usa_gas: false,
      }),
      this.localRepo.create({
        establecimiento_id: greenCollege.id,
        numero_local: 5,
        nombre: 'Casino Central',
        direccion: 'Calle Carlos Richter 568',
        usa_gas: true,
      }),
      this.localRepo.create({
        establecimiento_id: greenCollege.id,
        numero_local: 6,
        nombre: 'Taller Industrial',
        direccion: 'Calle Carlos Richter 570',
        usa_gas: true,
      }),
    ]);

    // Montessori - 1 local
    const localMontessori = await this.localRepo.save(
      this.localRepo.create({
        establecimiento_id: montessori.id,
        numero_local: 1,
        nombre: 'Local Principal',
        direccion: 'Parcela 11, Jardines de Frutillar',
        usa_gas: true,
      }),
    );

    // Los Linares - 1 local
    const localLosLinares = await this.localRepo.save(
      this.localRepo.create({
        establecimiento_id: losLinares.id,
        numero_local: 1,
        nombre: 'Local Principal',
        direccion: 'Calle Roberto Simpson 130, Casma',
        usa_gas: true,
      }),
    );

    // Mario Pérez - 1 local
    const localMarioPérez = await this.localRepo.save(
      this.localRepo.create({
        establecimiento_id: marioPérez.id,
        numero_local: 1,
        nombre: 'Local Principal',
        direccion: 'Sector Los Bajos, Kilómetro 14',
        usa_gas: true,
      }),
    );

    // Paraguay - 1 local
    const localParaguay = await this.localRepo.save(
      this.localRepo.create({
        establecimiento_id: paraguay.id,
        numero_local: 1,
        nombre: 'Local Principal',
        direccion: 'Sector Rural Paraguay',
        usa_gas: true,
      }),
    );

    // Madre de Dios - 5 locales
    const localesMadreDeDios = await this.localRepo.save([
      this.localRepo.create({
        establecimiento_id: madreDeDios.id,
        numero_local: 1,
        nombre: 'Sede Principal',
        direccion: 'Sector Rural Frutillar',
        usa_gas: true,
      }),
      this.localRepo.create({
        establecimiento_id: madreDeDios.id,
        numero_local: 2,
        nombre: 'Pabellón A',
        direccion: 'Sector Rural Frutillar',
        usa_gas: true,
      }),
      this.localRepo.create({
        establecimiento_id: madreDeDios.id,
        numero_local: 3,
        nombre: 'Pabellón B',
        direccion: 'Sector Rural Frutillar',
        usa_gas: false,
      }),
      this.localRepo.create({
        establecimiento_id: madreDeDios.id,
        numero_local: 4,
        nombre: 'Cocina',
        direccion: 'Sector Rural Frutillar',
        usa_gas: true,
      }),
      this.localRepo.create({
        establecimiento_id: madreDeDios.id,
        numero_local: 5,
        nombre: 'Sala Multiuso',
        direccion: 'Sector Rural Frutillar',
        usa_gas: false,
      }),
    ]);

    this.logger.log('Created locales');

    // ========================
    // 4. INSTALACIONES (for gas-using locales)
    // ========================
    await this.instalacionRepo.save([
      this.instalacionRepo.create({
        local_id: localPhilippi.id,
        tipo_gas: TipoGas.GLP,
        abastecimiento: Abastecimiento.CILINDROS_45,
        zona_abastecimiento: ZonaAbastecimiento.CASINO,
        referencia: 'Casino principal',
        artefacto_cilindro: 'Cocina industrial 6 quemadores',
      }),
      this.instalacionRepo.create({
        local_id: localLichaf.id,
        tipo_gas: TipoGas.GLP,
        abastecimiento: Abastecimiento.GDR,
        zona_abastecimiento: ZonaAbastecimiento.CASINO,
        referencia: 'Casino central',
        artefacto_cilindro: 'Cocina industrial + calefón',
      }),
      this.instalacionRepo.create({
        local_id: localInstituto.id,
        tipo_gas: TipoGas.GAS_NATURAL,
        abastecimiento: Abastecimiento.GDR,
        zona_abastecimiento: ZonaAbastecimiento.CASINO,
        referencia: 'Zona casino',
        artefacto_cilindro: 'Cocina 4 quemadores',
      }),
      this.instalacionRepo.create({
        local_id: localAlessandri.id,
        tipo_gas: TipoGas.GLP,
        abastecimiento: Abastecimiento.EQUIPO_GLP,
        zona_abastecimiento: ZonaAbastecimiento.CASINO,
        referencia: 'Casino',
        artefacto_cilindro: 'Cocina industrial',
      }),
      this.instalacionRepo.create({
        local_id: localClaudioMatte.id,
        tipo_gas: TipoGas.GLP,
        abastecimiento: Abastecimiento.CILINDROS_11_15,
        zona_abastecimiento: ZonaAbastecimiento.CASINO,
        referencia: 'Casino escolar',
        artefacto_cilindro: 'Cocina 6 quemadores',
      }),
      this.instalacionRepo.create({
        local_id: localesGreenCollege[0].id,
        tipo_gas: TipoGas.GLP,
        abastecimiento: Abastecimiento.GRANEL,
        zona_abastecimiento: ZonaAbastecimiento.CASINO,
        referencia: 'Casino sede central',
        artefacto_cilindro: 'Cocina industrial + calefón',
      }),
      this.instalacionRepo.create({
        local_id: localMontessori.id,
        tipo_gas: TipoGas.GLP,
        abastecimiento: Abastecimiento.CILINDROS_45,
        zona_abastecimiento: ZonaAbastecimiento.CASINO,
        referencia: 'Casino',
        artefacto_cilindro: 'Cocina 4 quemadores',
      }),
      this.instalacionRepo.create({
        local_id: localLosLinares.id,
        tipo_gas: TipoGas.GLP,
        abastecimiento: Abastecimiento.CILINDROS_11_15,
        zona_abastecimiento: ZonaAbastecimiento.CASINO,
        referencia: 'Casino escolar rural',
        artefacto_cilindro: 'Cocina 4 quemadores',
      }),
    ]);

    this.logger.log('Created instalaciones');

    // ========================
    // 5. EXPEDIENTES
    // ========================
    const fechaHoy = new Date();
    const hace2Anos = new Date();
    hace2Anos.setFullYear(fechaHoy.getFullYear() - 2);
    hace2Anos.setMonth(0); // January 2 years ago

    const hace6Meses = new Date();
    hace6Meses.setMonth(hace6Meses.getMonth() - 6);

    const hace3Meses = new Date();
    hace3Meses.setMonth(hace3Meses.getMonth() - 3);

    // Philippi - Sello Verde
    const expPhilippi = await this.expedienteRepo.save(
      this.expedienteRepo.create({
        establecimiento_id: philippi.id,
        empresa_instaladora: 'Gastech Chile SpA',
        rut_empresa: '76.123.456-7',
        estado_tc6: EstadoTC6.TC6_APROBADO,
        estado_general: EstadoGeneral.SELLO_VERDE,
        monto_presupuesto: 4500000,
        monto_ejecutado: 4200000,
        fecha_inicio: hace2Anos,
      }),
    );

    // LICHAF - Sello Verde
    const expLichaf = await this.expedienteRepo.save(
      this.expedienteRepo.create({
        establecimiento_id: lichaf.id,
        empresa_instaladora: 'Instalgas Sur Ltda.',
        rut_empresa: '77.234.567-8',
        estado_tc6: EstadoTC6.TC6_APROBADO,
        estado_general: EstadoGeneral.SELLO_VERDE,
        monto_presupuesto: 5800000,
        monto_ejecutado: 5800000,
        fecha_inicio: hace2Anos,
      }),
    );

    // Instituto Alemán - Sello Verde
    const expInstituto = await this.expedienteRepo.save(
      this.expedienteRepo.create({
        establecimiento_id: institutoAleman.id,
        empresa_instaladora: 'GasSeguro Frutillar',
        rut_empresa: '78.345.678-9',
        estado_tc6: EstadoTC6.TC6_APROBADO,
        estado_general: EstadoGeneral.SELLO_VERDE,
        monto_presupuesto: 3200000,
        monto_ejecutado: 3100000,
        fecha_inicio: hace2Anos,
      }),
    );

    // Alessandri - En Proyecto (TC6: en_elaboracion)
    const expAlessandri = await this.expedienteRepo.save(
      this.expedienteRepo.create({
        establecimiento_id: alessandri.id,
        empresa_instaladora: 'Gastech Chile SpA',
        rut_empresa: '76.123.456-7',
        estado_tc6: EstadoTC6.EN_ELABORACION,
        estado_general: EstadoGeneral.EN_PROYECTO,
        monto_presupuesto: 6200000,
        fecha_inicio: hace3Meses,
      }),
    );

    // Claudio Matte - En Proyecto (TC6: ingresado_sec)
    const expClaudioMatte = await this.expedienteRepo.save(
      this.expedienteRepo.create({
        establecimiento_id: claudioMatte.id,
        empresa_instaladora: 'Instalgas Sur Ltda.',
        rut_empresa: '77.234.567-8',
        estado_tc6: EstadoTC6.INGRESADO_SEC,
        estado_general: EstadoGeneral.EN_PROYECTO,
        monto_presupuesto: 4800000,
        fecha_inicio: hace6Meses,
      }),
    );

    // Green College - Sello Rojo
    const expGreenCollege = await this.expedienteRepo.save(
      this.expedienteRepo.create({
        establecimiento_id: greenCollege.id,
        empresa_instaladora: 'Seguridad Gas Austral',
        rut_empresa: '79.456.789-0',
        estado_tc6: EstadoTC6.TC6_APROBADO,
        estado_general: EstadoGeneral.SELLO_ROJO,
        monto_presupuesto: 12000000,
        monto_ejecutado: 8000000,
        fecha_inicio: hace6Meses,
      }),
    );

    // Montessori - Sello Amarillo
    const expMontessori = await this.expedienteRepo.save(
      this.expedienteRepo.create({
        establecimiento_id: montessori.id,
        empresa_instaladora: 'GasSeguro Frutillar',
        rut_empresa: '78.345.678-9',
        estado_tc6: EstadoTC6.TC6_APROBADO,
        estado_general: EstadoGeneral.SELLO_AMARILLO,
        monto_presupuesto: 3500000,
        monto_ejecutado: 2800000,
        fecha_inicio: hace3Meses,
      }),
    );

    // Los Linares - Sello Amarillo
    const expLosLinares = await this.expedienteRepo.save(
      this.expedienteRepo.create({
        establecimiento_id: losLinares.id,
        empresa_instaladora: 'Instalgas Sur Ltda.',
        rut_empresa: '77.234.567-8',
        estado_tc6: EstadoTC6.TC6_APROBADO,
        estado_general: EstadoGeneral.SELLO_AMARILLO,
        monto_presupuesto: 2900000,
        fecha_inicio: hace3Meses,
      }),
    );

    // Mario Pérez - En Levantamiento
    const expMarioPérez = await this.expedienteRepo.save(
      this.expedienteRepo.create({
        establecimiento_id: marioPérez.id,
        empresa_instaladora: 'Gastech Chile SpA',
        rut_empresa: '76.123.456-7',
        estado_tc6: EstadoTC6.SIN_INICIAR,
        estado_general: EstadoGeneral.EN_LEVANTAMIENTO,
        fecha_inicio: fechaHoy,
      }),
    );

    // Paraguay - En Levantamiento
    const expParaguay = await this.expedienteRepo.save(
      this.expedienteRepo.create({
        establecimiento_id: paraguay.id,
        empresa_instaladora: 'GasSeguro Frutillar',
        rut_empresa: '78.345.678-9',
        estado_tc6: EstadoTC6.SIN_INICIAR,
        estado_general: EstadoGeneral.EN_LEVANTAMIENTO,
        fecha_inicio: fechaHoy,
      }),
    );

    // Madre de Dios - En Certificación
    const expMadreDeDios = await this.expedienteRepo.save(
      this.expedienteRepo.create({
        establecimiento_id: madreDeDios.id,
        empresa_instaladora: 'Seguridad Gas Austral',
        rut_empresa: '79.456.789-0',
        estado_tc6: EstadoTC6.TC6_APROBADO,
        estado_general: EstadoGeneral.EN_CERTIFICACION,
        monto_presupuesto: 7500000,
        monto_ejecutado: 7500000,
        fecha_inicio: hace6Meses,
      }),
    );

    this.logger.log('Created 11 expedientes (Sin gestión ones need no expediente)');

    // ========================
    // 6. CERTIFICACIONES
    // ========================

    // Date helpers
    const addDays = (date: Date, days: number): Date => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    };

    // Sello Verde certifications
    const fechaInspeccionPhilippi = new Date('2024-06-01');
    const certPhilippi = await this.certificacionRepo.save(
      this.certificacionRepo.create({
        expediente_id: expPhilippi.id,
        tipo_sello: TipoSello.VERDE,
        nombre_inspector: 'Ingeniero Carlos Hoffmann',
        entidad_certificadora: 'SEC Chile',
        fecha_inspeccion: fechaInspeccionPhilippi,
        numero_certificado: 'CERT-2024-001',
        observaciones: 'Instalación en óptimas condiciones',
      }),
    );

    const fechaInspeccionLichaf = new Date('2024-05-15');
    const certLichaf = await this.certificacionRepo.save(
      this.certificacionRepo.create({
        expediente_id: expLichaf.id,
        tipo_sello: TipoSello.VERDE,
        nombre_inspector: 'Ing. María González',
        entidad_certificadora: 'SEC Chile',
        fecha_inspeccion: fechaInspeccionLichaf,
        numero_certificado: 'CERT-2024-002',
        observaciones: 'Sello verde otorgado sin observaciones',
      }),
    );

    const fechaInspeccionInstituto = new Date('2024-04-10');
    const certInstituto = await this.certificacionRepo.save(
      this.certificacionRepo.create({
        expediente_id: expInstituto.id,
        tipo_sello: TipoSello.VERDE,
        nombre_inspector: 'Ing. Pedro Müller',
        entidad_certificadora: 'Certgas Austral',
        fecha_inspeccion: fechaInspeccionInstituto,
        numero_certificado: 'CERT-2024-003',
        observaciones: 'Sin observaciones',
      }),
    );

    // Sello Rojo - Green College
    const fechaInspeccionGreen = new Date();
    fechaInspeccionGreen.setDate(fechaInspeccionGreen.getDate() - 30);
    const certGreenCollege = await this.certificacionRepo.save(
      this.certificacionRepo.create({
        expediente_id: expGreenCollege.id,
        tipo_sello: TipoSello.ROJO,
        nombre_inspector: 'Ing. Roberto Siebert',
        entidad_certificadora: 'SEC Chile',
        fecha_inspeccion: fechaInspeccionGreen,
        numero_certificado: 'CERT-2024-004',
        observaciones: 'Se detectaron 3 defectos críticos. Sello Rojo emitido.',
      }),
    );

    // Sello Amarillo - Montessori
    const fechaInspeccionMontessori = new Date();
    fechaInspeccionMontessori.setDate(fechaInspeccionMontessori.getDate() - 45);
    const certMontessori = await this.certificacionRepo.save(
      this.certificacionRepo.create({
        expediente_id: expMontessori.id,
        tipo_sello: TipoSello.AMARILLO,
        nombre_inspector: 'Ing. Ana Pérez',
        entidad_certificadora: 'Certgas Austral',
        fecha_inspeccion: fechaInspeccionMontessori,
        numero_certificado: 'CERT-2024-005',
        observaciones: 'Defectos menores detectados. Plazo 90 días para regularizar.',
      }),
    );

    // Sello Amarillo - Los Linares
    const fechaInspeccionLinares = new Date();
    fechaInspeccionLinares.setDate(fechaInspeccionLinares.getDate() - 20);
    const certLosLinares = await this.certificacionRepo.save(
      this.certificacionRepo.create({
        expediente_id: expLosLinares.id,
        tipo_sello: TipoSello.AMARILLO,
        nombre_inspector: 'Ing. Luis Valdivia',
        entidad_certificadora: 'SEC Chile',
        fecha_inspeccion: fechaInspeccionLinares,
        numero_certificado: 'CERT-2024-006',
        observaciones: 'Instalación con defectos. Plazo 90 días.',
      }),
    );

    this.logger.log('Created certificaciones');

    // ========================
    // 7. DEFECTOS (Green College - 3, Montessori - 2, Los Linares - 1)
    // ========================
    await this.defectoRepo.save([
      // Green College defectos
      this.defectoRepo.create({
        certificacion_id: certGreenCollege.id,
        tipo_defecto: TipoDefecto.FUGAS_ARTEFACTOS,
        instalacion_afectada: 'Cocina casino sede central - quemador 3',
        descripcion: 'Fuga detectada en conexión flexible del quemador N°3',
      }),
      this.defectoRepo.create({
        certificacion_id: certGreenCollege.id,
        tipo_defecto: TipoDefecto.CO_SUPERIOR_50PPM,
        instalacion_afectada: 'Casino sede central',
        descripcion: 'Lectura de CO ambiente: 78 ppm. Supera límite normativo de 50 ppm.',
      }),
      this.defectoRepo.create({
        certificacion_id: certGreenCollege.id,
        tipo_defecto: TipoDefecto.SIN_CONDUCTO_EVACUACION,
        instalacion_afectada: 'Calefón sala de profesores',
        descripcion: 'Calefón tipo B sin conducto de evacuación de gases al exterior.',
      }),
      // Montessori defectos
      this.defectoRepo.create({
        certificacion_id: certMontessori.id,
        tipo_defecto: TipoDefecto.FUGAS_RED,
        instalacion_afectada: 'Red de distribución sector casino',
        descripcion: 'Fuga detectada en unión roscada cañería distribución.',
      }),
      this.defectoRepo.create({
        certificacion_id: certMontessori.id,
        tipo_defecto: TipoDefecto.LECTURA_TIRO_IGUAL,
        instalacion_afectada: 'Calefón sala multiuso',
        descripcion: 'Lectura de tiro igual a cero. Evacuación deficiente.',
      }),
      // Los Linares defectos
      this.defectoRepo.create({
        certificacion_id: certLosLinares.id,
        tipo_defecto: TipoDefecto.FUGAS_MEDIDOR,
        instalacion_afectada: 'Medidor GLP entrada principal',
        descripcion: 'Fuga detectada en selector de manómetro del medidor.',
      }),
    ]);

    this.logger.log('Created defectos');

    // ========================
    // 8. ALERTAS
    // ========================
    const alertas = [];

    // Sello Verde alerts (2 years = 730 days from inspection)
    alertas.push(
      this.alertaRepo.create({
        expediente_id: expPhilippi.id,
        certificacion_id: certPhilippi.id,
        tipo: TipoAlerta.VENCIMIENTO_SELLO_VERDE,
        estado: EstadoAlerta.ACTIVA,
        fecha_vencimiento: addDays(fechaInspeccionPhilippi, 730),
        mensaje: `Sello Verde Philippi vence el ${addDays(fechaInspeccionPhilippi, 730).toLocaleDateString('es-CL')}`,
      }),
    );

    alertas.push(
      this.alertaRepo.create({
        expediente_id: expLichaf.id,
        certificacion_id: certLichaf.id,
        tipo: TipoAlerta.VENCIMIENTO_SELLO_VERDE,
        estado: EstadoAlerta.ACTIVA,
        fecha_vencimiento: addDays(fechaInspeccionLichaf, 730),
        mensaje: `Sello Verde LICHAF vence el ${addDays(fechaInspeccionLichaf, 730).toLocaleDateString('es-CL')}`,
      }),
    );

    alertas.push(
      this.alertaRepo.create({
        expediente_id: expInstituto.id,
        certificacion_id: certInstituto.id,
        tipo: TipoAlerta.VENCIMIENTO_SELLO_VERDE,
        estado: EstadoAlerta.ACTIVA,
        fecha_vencimiento: addDays(fechaInspeccionInstituto, 730),
        mensaje: `Sello Verde Instituto Alemán vence el ${addDays(fechaInspeccionInstituto, 730).toLocaleDateString('es-CL')}`,
      }),
    );

    // Sello Rojo/Amarillo alerts (90 days from inspection)
    alertas.push(
      this.alertaRepo.create({
        expediente_id: expGreenCollege.id,
        certificacion_id: certGreenCollege.id,
        tipo: TipoAlerta.PLAZO_REGULARIZACION_90D,
        estado: EstadoAlerta.ACTIVA,
        fecha_vencimiento: addDays(fechaInspeccionGreen, 90),
        mensaje: `⚠️ URGENTE: Plazo 90 días Green College vence el ${addDays(fechaInspeccionGreen, 90).toLocaleDateString('es-CL')}`,
      }),
    );

    alertas.push(
      this.alertaRepo.create({
        expediente_id: expMontessori.id,
        certificacion_id: certMontessori.id,
        tipo: TipoAlerta.PLAZO_REGULARIZACION_90D,
        estado: EstadoAlerta.ACTIVA,
        fecha_vencimiento: addDays(fechaInspeccionMontessori, 90),
        mensaje: `Plazo 90 días Montessori vence el ${addDays(fechaInspeccionMontessori, 90).toLocaleDateString('es-CL')}`,
      }),
    );

    alertas.push(
      this.alertaRepo.create({
        expediente_id: expLosLinares.id,
        certificacion_id: certLosLinares.id,
        tipo: TipoAlerta.PLAZO_REGULARIZACION_90D,
        estado: EstadoAlerta.ACTIVA,
        fecha_vencimiento: addDays(fechaInspeccionLinares, 90),
        mensaje: `Plazo 90 días Los Linares vence el ${addDays(fechaInspeccionLinares, 90).toLocaleDateString('es-CL')}`,
      }),
    );

    await this.alertaRepo.save(alertas);
    this.logger.log('Created alertas');

    this.logger.log('🎉 Seed complete! Summary:');
    this.logger.log('  - 1 admin user (admin@slep.cl / slep2024)');
    this.logger.log('  - 13 establecimientos');
    this.logger.log('  - 3 sello_verde (Philippi, LICHAF, Instituto Alemán)');
    this.logger.log('  - 2 en_proyecto (Alessandri, Claudio Matte)');
    this.logger.log('  - 1 sello_rojo (Green College - 6 locales, 3 defectos)');
    this.logger.log('  - 2 sello_amarillo (Montessori, Los Linares)');
    this.logger.log('  - 2 en_levantamiento (Mario Pérez, Paraguay)');
    this.logger.log('  - 2 sin_gestion (Colonia San Martín, Carlos Springer)');
    this.logger.log('  - 1 en_certificacion (Madre de Dios - 5 locales)');
    this.logger.log('  - 6 certificaciones with defectos');
    this.logger.log('  - 6 alertas auto-generated');
  }
}
