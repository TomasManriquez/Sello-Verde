import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EstadoTC6 } from '../../common/enums';
import { Expediente } from './expediente.entity';

@Entity('hitos_tc6')
export class HitoTC6 {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  expediente_id: number;

  @ManyToOne(() => Expediente, (exp) => exp.hitos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expediente_id' })
  expediente: Expediente;

  @Column({ type: 'enum', enum: EstadoTC6, nullable: true })
  estado_anterior: EstadoTC6;

  @Column({ type: 'enum', enum: EstadoTC6 })
  estado_nuevo: EstadoTC6;

  @Column({ nullable: true, type: 'text' })
  observaciones: string;

  @CreateDateColumn()
  fecha: Date;
}
