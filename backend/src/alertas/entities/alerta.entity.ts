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

@Entity('alertas')
export class Alerta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  expediente_id: number;

  @ManyToOne(() => Expediente)
  @JoinColumn({ name: 'expediente_id' })
  expediente: Expediente;

  @Column({ nullable: true })
  certificacion_id: number;

  @ManyToOne(() => Certificacion, (cert) => cert.alertas, { nullable: true })
  @JoinColumn({ name: 'certificacion_id' })
  certificacion: Certificacion;

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
