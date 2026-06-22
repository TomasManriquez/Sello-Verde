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
import { TipoSello } from '../../common/enums';
import { Expediente } from '../../expedientes/entities/expediente.entity';
import { Defecto } from './defecto.entity';
import { Alerta } from '../../alertas/entities/alerta.entity';

@Entity('certificaciones')
export class Certificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  expediente_id: number;

  @ManyToOne(() => Expediente, (exp) => exp.certificaciones)
  @JoinColumn({ name: 'expediente_id' })
  expediente: Expediente;

  @Column({
    type: 'enum',
    enum: TipoSello,
    nullable: true,
  })
  tipo_sello: TipoSello;

  @Column({ nullable: true })
  nombre_inspector: string;

  @Column({ nullable: true })
  entidad_certificadora: string;

  @Column({ nullable: true })
  rut_inspector: string;

  @Column({ nullable: true, type: 'date' })
  fecha_inspeccion: Date;

  @Column({ nullable: true })
  numero_certificado: string;

  @Column({ nullable: true })
  url_certificado: string;

  @Column({ nullable: true, type: 'text' })
  observaciones: string;

  @OneToMany(() => Defecto, (def) => def.certificacion, { cascade: true })
  defectos: Defecto[];

  @OneToMany(() => Alerta, (alerta) => alerta.certificacion)
  alertas: Alerta[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
