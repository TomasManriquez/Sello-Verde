import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificadoresController } from './certificadores.controller';
import { CertificadoresService } from './certificadores.service';
import { Certificador } from './entities/certificador.entity';
import { CertificacionesModule } from '../certificaciones/certificaciones.module';

@Module({
  imports: [TypeOrmModule.forFeature([Certificador]), forwardRef(() => CertificacionesModule)],
  controllers: [CertificadoresController],
  providers: [CertificadoresService],
  exports: [CertificadoresService],
})
export class CertificadoresModule {}
