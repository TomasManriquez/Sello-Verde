import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Expediente } from '../../expedientes/entities/expediente.entity';

/**
 * Empresa que provee insumos técnicos y mano de obra para la instalación de gas
 * (contratista de la licitación). Es distinta del certificador, que valida la instalación.
 *
 * Se desactiva (`activa = false`) en vez de eliminarse: los expedientes históricos
 * deben seguir mostrando su empresa, y una relación hacia una fila eliminada lógicamente
 * no se carga en TypeORM.
 */
@Entity('empresas')
export class Empresa {
  @PrimaryGeneratedColumn()
  id: number;

  /** Formato "76.123.456-7". Opcional; único cuando existe. */
  @Column({ type: 'varchar', nullable: true, unique: true })
  rut: string;

  @Column()
  razon_social: string;

  @Column({ nullable: true })
  contacto: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: true })
  activa: boolean;

  @OneToMany(() => Expediente, (exp) => exp.empresa)
  expedientes: Expediente[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
