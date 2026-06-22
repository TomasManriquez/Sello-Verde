import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { EstadoGeneral } from '../../common/enums';
import { Local } from './local.entity';
import { Expediente } from '../../expedientes/entities/expediente.entity';

@Entity('establecimientos')
export class Establecimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  rbd: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  direccion: string;

  @Column({ nullable: true })
  nombre_propietario: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  comuna: string;

  @Column({ nullable: true })
  region: string;

  @Column({
    type: 'enum',
    enum: EstadoGeneral,
    default: EstadoGeneral.SIN_GESTION,
  })
  estado_general: EstadoGeneral;

  @Column({ nullable: true })
  cantidad_locales: number;

  @Column({ nullable: true, type: 'text' })
  observaciones: string;

  @OneToMany(() => Local, (local) => local.establecimiento, { cascade: true })
  locales: Local[];

  @OneToMany(() => Expediente, (expediente) => expediente.establecimiento)
  expedientes: Expediente[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
