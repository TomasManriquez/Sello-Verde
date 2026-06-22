import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TipoDefecto } from '../../common/enums';
import { Certificacion } from './certificacion.entity';

@Entity('defectos')
export class Defecto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  certificacion_id: number;

  @ManyToOne(() => Certificacion, (cert) => cert.defectos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'certificacion_id' })
  certificacion: Certificacion;

  @Column({
    type: 'enum',
    enum: TipoDefecto,
  })
  tipo_defecto: TipoDefecto;

  @Column({ nullable: true, type: 'text' })
  instalacion_afectada: string;

  @Column({ nullable: true, type: 'text' })
  descripcion: string;

  @CreateDateColumn()
  created_at: Date;
}
