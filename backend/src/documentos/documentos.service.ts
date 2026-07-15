import {
  Injectable,
  NotFoundException,
  BadRequestException,
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

  // ── Helpers ─────────────────────────────────────────────────

  /**
   * Converts a filesystem path (e.g. "uploads\expedientes\4\file.pdf")
   * to a web-relative URL (e.g. "/uploads/expedientes/4/file.pdf").
   * The frontend prepends API_HOST to build the full absolute URL.
   */
  private buildRelativeUrl(ruta: string): string {
    // Normalize backslashes to forward slashes (Windows compatibility)
    const normalized = ruta.replace(/\\/g, '/');
    // Ensure it starts with /
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }

  /**
   * Maps a raw Documento entity to its public shape, including the relative URL.
   */
  private toDto(doc: Documento) {
    return {
      ...doc,
      url: this.buildRelativeUrl(doc.ruta),
    };
  }

  // ── findByExpediente ─────────────────────────────────────────

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

    return { data: items.map((doc) => this.toDto(doc)), message: 'OK' };
  }

  // ── findOne ──────────────────────────────────────────────────

  async findOne(id: number) {
    const doc = await this.documentoRepository.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Documento #${id} no encontrado`);
    }
    return doc;
  }

  // ── create (with overwrite by original name) ─────────────────

  async create(
    expedienteId: number,
    file: Express.Multer.File,
    descripcion?: string,
  ) {
    const expediente = await this.expedienteRepository.findOne({
      where: { id: expedienteId },
    });
    if (!expediente) {
      // Clean up uploaded file on error
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new NotFoundException(`Expediente #${expedienteId} no encontrado`);
    }

    // Check for existing document with same original name in this expediente
    const existing = await this.documentoRepository.findOne({
      where: {
        expediente_id: expedienteId,
        nombre_original: file.originalname,
      },
    });

    if (existing) {
      // Delete old physical file before replacing the record
      if (existing.ruta && fs.existsSync(existing.ruta)) {
        fs.unlinkSync(existing.ruta);
      }

      // Update the existing record in-place (overwrite)
      existing.nombre_archivo = file.filename;
      existing.ruta = file.path;
      existing.tipo_mime = file.mimetype;
      existing.tamano_bytes = file.size;
      if (descripcion !== undefined) existing.descripcion = descripcion;

      const saved = await this.documentoRepository.save(existing);
      return {
        data: this.toDto(saved),
        message: 'Documento sobreescrito exitosamente',
      };
    }

    // New document
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
    return { data: this.toDto(saved), message: 'Documento subido exitosamente' };
  }

  // ── rename ───────────────────────────────────────────────────

  async rename(id: number, nuevoNombre: string) {
    const doc = await this.findOne(id);

    const trimmed = nuevoNombre.trim();
    if (!trimmed) {
      throw new BadRequestException('El nombre no puede estar vacío');
    }

    // Keep the original file extension if the new name lacks one
    const originalExt = path.extname(doc.nombre_original);
    const newExt = path.extname(trimmed);
    const finalName = newExt ? trimmed : `${trimmed}${originalExt}`;

    doc.nombre_original = finalName;
    const saved = await this.documentoRepository.save(doc);
    return { data: this.toDto(saved), message: 'Documento renombrado exitosamente' };
  }

  // ── delete ───────────────────────────────────────────────────

  async delete(id: number) {
    const doc = await this.findOne(id);

    // Remove physical file
    if (doc.ruta && fs.existsSync(doc.ruta)) {
      fs.unlinkSync(doc.ruta);
    }

    await this.documentoRepository.remove(doc);
    return { message: 'Documento eliminado exitosamente' };
  }

  // ── getFilePath (for download streaming) ─────────────────────

  async getFilePath(id: number): Promise<{ filePath: string; nombreOriginal: string }> {
    const doc = await this.findOne(id);

    const absolutePath = path.resolve(doc.ruta);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException(
        `Archivo físico no encontrado para el documento #${id}`,
      );
    }

    return { filePath: absolutePath, nombreOriginal: doc.nombre_original };
  }
}
