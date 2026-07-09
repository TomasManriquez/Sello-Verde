import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { EstablecimientosModule } from './establecimientos/establecimientos.module';
import { InstalacionesModule } from './instalaciones/instalaciones.module';
import { ExpedientesModule } from './expedientes/expedientes.module';
import { CertificacionesModule } from './certificaciones/certificaciones.module';
import { AlertasModule } from './alertas/alertas.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentosModule } from './documentos/documentos.module';
import { SeedModule } from './database/seed/seed.module';

// Entities
import { Usuario } from './auth/entities/usuario.entity';
import { Establecimiento } from './establecimientos/entities/establecimiento.entity';
import { Local } from './establecimientos/entities/local.entity';
import { Instalacion } from './instalaciones/entities/instalacion.entity';
import { Expediente } from './expedientes/entities/expediente.entity';
import { HitoTC6 } from './expedientes/entities/hito-tc6.entity';
import { Certificacion } from './certificaciones/entities/certificacion.entity';
import { Defecto } from './certificaciones/entities/defecto.entity';
import { Alerta } from './alertas/entities/alerta.entity';
import { Documento } from './documentos/entities/documento.entity';

@Module({
  imports: [
    // Database
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'sello_verde_2024',
      database: process.env.DATABASE_NAME || 'sello_verde',
      entities: [
        Usuario,
        Establecimiento,
        Local,
        Instalacion,
        Expediente,
        HitoTC6,
        Certificacion,
        Defecto,
        Alerta,
        Documento,
      ],
      synchronize: true, // MVP only — use migrations in production
      logging: process.env.NODE_ENV === 'development',
    }),

    // Cron scheduling
    ScheduleModule.forRoot(),

    // Feature modules
    AuthModule,
    EstablecimientosModule,
    InstalacionesModule,
    ExpedientesModule,
    CertificacionesModule,
    AlertasModule,
    DashboardModule,
    DocumentosModule,

    // Seed module - runs on bootstrap if DB is empty
    SeedModule,
  ],
})
export class AppModule {}
