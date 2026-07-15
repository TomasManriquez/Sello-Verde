import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { DocumentosService } from './documentos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as fs from 'fs';

@UseGuards(JwtAuthGuard)
@Controller('expedientes')
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  @Get(':expedienteId/documentos')
  findByExpediente(@Param('expedienteId', ParseIntPipe) expedienteId: number) {
    return this.service.findByExpediente(expedienteId);
  }

  @Post(':expedienteId/documentos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: async (req, file, cb) => {
          // Get expedienteId from params
          const expedienteId = req.params.expedienteId;
          
          // We need the establecimientoId to create a clean folder structure
          // We'll fetch it via a service call or look it up in the DB
          // For now, we use a dedicated subfolder to avoid root pollution
          const uploadDir = join('uploads', 'expedientes', expedienteId.toString());
          
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
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

  // @Get(':expedienteId/:filename')
  // download(
  //   @Param('expedienteId', ParseIntPipe) expedienteId: number,
  //   @Param('filename') filename: string,
  //   @Res() res: any,
  // ) {
  //   const filePath = join('uploads', 'expedientes', expedienteId.toString(), filename);
  //   res.download(filePath);
  // }
}
