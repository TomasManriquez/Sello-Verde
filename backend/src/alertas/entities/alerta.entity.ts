import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TipoAlerta, EstadoAlerta } from '../../common/enums';
import { Expediente } from '../../expedientes/entities/expediente.entity';
import { Certificacion } from '../../certificaciones/entities/certificacion.entity';
import { Instalacion } from '../../instalaciones/entities/instalacion.entity';

@Entity('alertas')
export class Alerta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  expediente_id: number;

  @ManyToOne(() => Expediente, (exp) => exp.alertas)
  @JoinColumn({ name: 'expediente_id' })
  expediente: Expediente;

  @Column({ nullable: true })
  certificacion_id: number;

  @ManyToOne(() => Certificacion, (cert) => cert.alertas, { nullable: true })
  @JoinColumn({ name: 'certificacion_id' })
  certificacion: Certificacion;

  /** Instalación específica a la que aplica la alerta (para lifecycle por instalación) */
  @Column({ nullable: true })
  instalacion_id: number;

  @ManyToOne(() => Instalacion, { nullable: true })
  @JoinColumn({ name: 'instalacion_id' })
  instalacion: Instalacion;

  @Column({
    type: 'enum',
    enum: TipoAlerta,
  })
  tipo: TipoAlerta;

  @Column({
    type: 'enum',
    enum: EstadoAlerta,
    default: EstadoAlerta.ACTIVA,
  })
  estado: EstadoAlerta;

  @Column({ type: 'date' })
  fecha_vencimiento: Date;

  @Column({ nullable: true, type: 'text' })
  mensaje: string;

  @Column({ nullable: true, type: 'timestamp' })
  fecha_notificacion: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
