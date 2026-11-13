import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificacionesController } from './certificaciones.controller';
import { CertificacionesService } from './certificaciones.service';
import { Certificacion } from './entities/certificacion.entity';
import { Defecto } from './entities/defecto.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Local } from '../establecimientos/entities/local.entity';
import { Instalacion } from '../instalaciones/entities/instalacion.entity';
import { CertificadoresModule } from '../certificadores/certificadores.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Certificacion,
      Defecto,
      Expediente,
      Establecimiento,
      Local,
      Instalacion,
    ]),
    forwardRef(() => CertificadoresModule),
  ],
  controllers: [CertificacionesController],
  providers: [CertificacionesService],
  exports: [CertificacionesService],
})
export class CertificacionesModule {}
