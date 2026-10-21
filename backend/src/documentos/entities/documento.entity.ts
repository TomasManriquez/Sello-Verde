import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Expediente } from '../../expedientes/entities/expediente.entity';
import { CategoriaDocumento } from '../../common/enums';

@Entity('documentos')
export class Documento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  expediente_id: number;

  @ManyToOne(() => Expediente, (exp) => exp.documentos)
  @JoinColumn({ name: 'expediente_id' })
  expediente: Expediente;

  @Column()
  nombre_original: string;

  @Column()
  nombre_archivo: string;

  @Column()
  ruta: string;

  @Column({ nullable: true })
  tipo_mime: string;

  @Column({ nullable: true })
  tamano_bytes: number;

  @Column({ nullable: true })
  descripcion: string;

  /** Carpeta del expediente en que se clasifica el documento */
  @Column({
    type: 'enum',
    enum: CategoriaDocumento,
    default: CategoriaDocumento.OTROS,
  })
  categoria: CategoriaDocumento;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
