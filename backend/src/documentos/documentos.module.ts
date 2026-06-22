import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { Documento } from './entities/documento.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Documento, Expediente]),
    MulterModule.register({
      dest: 'uploads/',
    }),
  ],
  controllers: [DocumentosController],
  providers: [DocumentosService],
})
export class DocumentosModule {}
