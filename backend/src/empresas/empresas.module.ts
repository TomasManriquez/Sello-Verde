import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';
import { Empresa } from './entities/empresa.entity';
import { ExpedientesModule } from '../expedientes/expedientes.module';

@Module({
  imports: [TypeOrmModule.forFeature([Empresa]), forwardRef(() => ExpedientesModule)],
  controllers: [EmpresasController],
  providers: [EmpresasService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
