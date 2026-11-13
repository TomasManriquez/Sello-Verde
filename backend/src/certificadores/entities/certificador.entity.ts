import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Certificacion } from '../../certificaciones/entities/certificacion.entity';

/**
 * Persona que valida (inspecciona) una instalación de gas. No está vinculada a una empresa:
 * la empresa contratista y el certificador son entidades independientes.
 *
 * Se desactiva (`activo = false`) en vez de eliminarse, por la misma razón que `Empresa`.
 */
@Entity('certificadores')
export class Certificador {
  @PrimaryGeneratedColumn()
  id: number;

  /** Formato "12.345.678-9". Opcional; único cuando existe. */
  @Column({ type: 'varchar', nullable: true, unique: true })
  rut: string;

  @Column()
  nombre: string;

  /** Entidad u organismo al que pertenece, como texto libre (opcional) */
  @Column({ nullable: true })
  entidad: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => Certificacion, (cert) => cert.certificador)
  certificaciones: Certificacion[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
