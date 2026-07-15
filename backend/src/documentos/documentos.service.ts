import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from './entities/documento.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DocumentosService {
  constructor(
    @InjectRepository(Documento)
    private documentoRepository: Repository<Documento>,
    @InjectRepository(Expediente)
    private expedienteRepository: Repository<Expediente>,
  ) {}

  async findByExpediente(expedienteId: number) {
    const expediente = await this.expedienteRepository.findOne({
      where: { id: expedienteId },
    });
    if (!expediente) {
      throw new NotFoundException(`Expediente #${expedienteId} no encontrado`);
    }

    const items = await this.documentoRepository.find({
      where: { expediente_id: expedienteId },
      order: { created_at: 'DESC' },
    });

    // Map items to include the full public URL
    const data = items.map(doc => ({
      ...doc,
      url: `http://localhost:3001/uploads/${doc.ruta.replace('uploads/', '')}`.replace('uploads//', 'uploads/')
    }));

    return { data, message: 'OK' };
  }

  async create(
    expedienteId: number,
    file: Express.Multer.File,
    descripcion?: string,
  ) {
    const expediente = await this.expedienteRepository.findOne({
      where: { id: expedienteId },
    });
    if (!expediente) {
      // Clean up uploaded file
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new NotFoundException(`Expediente #${expedienteId} no encontrado`);
    }

    const doc = this.documentoRepository.create({
      expediente_id: expedienteId,
      nombre_original: file.originalname,
      nombre_archivo: file.filename,
      ruta: file.path,
      tipo_mime: file.mimetype,
      tamano_bytes: file.size,
      descripcion,
    });

    const saved = await this.documentoRepository.save(doc);
    return { data: saved, message: 'Documento subido exitosamente' };
  }
}
