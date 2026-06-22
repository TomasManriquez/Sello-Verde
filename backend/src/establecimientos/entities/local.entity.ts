import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Establecimiento } from './establecimiento.entity';
import { Instalacion } from '../../instalaciones/entities/instalacion.entity';

@Entity('locales')
export class Local {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  establecimiento_id: number;

  @ManyToOne(() => Establecimiento, (est) => est.locales, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'establecimiento_id' })
  establecimiento: Establecimiento;

  @Column()
  numero_local: number;

  @Column({ nullable: true })
  nombre: string;

  @Column({ nullable: true })
  direccion: string;

  @Column({ default: true })
  usa_gas: boolean;

  @Column({ nullable: true, type: 'text' })
  observaciones: string;

  @OneToMany(() => Instalacion, (inst) => inst.local, { cascade: true })
  instalaciones: Instalacion[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
