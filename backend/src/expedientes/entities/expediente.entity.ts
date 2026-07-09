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
import { EstadoTC6, EstadoGeneral } from '../../common/enums';
import { Establecimiento } from '../../establecimientos/entities/establecimiento.entity';
import { Certificacion } from '../../certificaciones/entities/certificacion.entity';
import { Documento } from '../../documentos/entities/documento.entity';
import { HitoTC6 } from './hito-tc6.entity';
import { Alerta } from '../../alertas/entities/alerta.entity';

@Entity('expedientes')
export class Expediente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  establecimiento_id: number;

  @ManyToOne(() => Establecimiento, (est) => est.expedientes)
  @JoinColumn({ name: 'establecimiento_id' })
  establecimiento: Establecimiento;

  @Column({ nullable: true })
  empresa_instaladora: string;

  @Column({ nullable: true })
  rut_empresa: string;

  @Column({ nullable: true })
  contacto_empresa: string;

  @Column({ nullable: true })
  telefono_empresa: string;

  @Column({ nullable: true })
  email_empresa: string;

  @Column({
    type: 'enum',
    enum: EstadoTC6,
    default: EstadoTC6.SIN_INICIAR,
  })
  estado_tc6: EstadoTC6;

  @Column({
    type: 'enum',
    enum: EstadoGeneral,
    default: EstadoGeneral.SIN_GESTION,
  })
  estado_general: EstadoGeneral;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  monto_presupuesto: number;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  monto_ejecutado: number;

  @Column({ nullable: true })
  numero_licitacion: string;

  @Column({ nullable: true, type: 'date' })
  fecha_inicio: Date;

  @Column({ nullable: true, type: 'date' })
  fecha_fin_estimada: Date;

  @Column({ nullable: true, type: 'text' })
  observaciones: string;

  @OneToMany(() => Certificacion, (cert) => cert.expediente)
  certificaciones: Certificacion[];

  @OneToMany(() => Documento, (doc) => doc.expediente)
  documentos: Documento[];

  @OneToMany(() => HitoTC6, (hito) => hito.expediente)
  hitos: HitoTC6[];

  @OneToMany(() => Alerta, (alerta) => alerta.expediente)
  alertas: Alerta[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
