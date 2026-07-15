import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { Response } from 'express';
import { DocumentosService } from './documentos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as fs from 'fs';

// ── Multer storage config ─────────────────────────────────────
const expedienteStorage = diskStorage({
  destination: (req, file, cb) => {
    const expedienteId = req.params.expedienteId;
    const uploadDir = join('uploads', 'expedientes', expedienteId.toString());

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize the original filename: replace spaces and special chars
    const sanitized = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._\-áéíóúÁÉÍÓÚñÑ]/g, '');
    cb(null, sanitized);
  },
});

@UseGuards(JwtAuthGuard)
@Controller('expedientes')
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  // ── GET /api/expedientes/:expedienteId/documentos ─────────────
  @Get(':expedienteId/documentos')
  findByExpediente(@Param('expedienteId', ParseIntPipe) expedienteId: number) {
    return this.service.findByExpediente(expedienteId);
  }

  // ── POST /api/expedientes/:expedienteId/documentos ────────────
  // Accepts multipart/form-data with field "file"
  // If a document with the same original name already exists → overwrites it
  @Post(':expedienteId/documentos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: expedienteStorage,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB
      },
    }),
  )
  create(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('descripcion') descripcion?: string,
  ) {
    return this.service.create(expedienteId, file, descripcion);
  }
}

// ── Separate controller for /api/documentos/:id/* ─────────────
@UseGuards(JwtAuthGuard)
@Controller('documentos')
export class DocumentosItemController {
  constructor(private readonly service: DocumentosService) {}

  // ── GET /api/documentos/:id/descargar ─────────────────────────
  // Forces a file download with Content-Disposition: attachment
  @Get(':id/descargar')
  async descargar(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { filePath, nombreOriginal } = await this.service.getFilePath(id);

    res.download(filePath, nombreOriginal, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ message: 'Error al descargar el archivo' });
      }
    });
  }

  // ── PATCH /api/documentos/:id/renombrar ───────────────────────
  @Patch(':id/renombrar')
  rename(
    @Param('id', ParseIntPipe) id: number,
    @Body('nombre') nombre: string,
  ) {
    return this.service.rename(id, nombre);
  }

  // ── DELETE /api/documentos/:id ────────────────────────────────
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
