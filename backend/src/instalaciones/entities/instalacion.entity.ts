import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TipoGas, Abastecimiento, ZonaAbastecimiento } from '../../common/enums';
import { Local } from '../../establecimientos/entities/local.entity';

@Entity('instalaciones')
export class Instalacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  local_id: number;

  @ManyToOne(() => Local, (local) => local.instalaciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'local_id' })
  local: Local;

  @Column({
    type: 'enum',
    enum: TipoGas,
    nullable: true,
  })
  tipo_gas: TipoGas;

  @Column({
    type: 'enum',
    enum: Abastecimiento,
    nullable: true,
  })
  abastecimiento: Abastecimiento;

  @Column({
    type: 'enum',
    enum: ZonaAbastecimiento,
    nullable: true,
  })
  zona_abastecimiento: ZonaAbastecimiento;

  @Column({ nullable: true })
  referencia: string;

  @Column({ nullable: true })
  artefacto_cilindro: string;

  @Column({ nullable: true, type: 'text' })
  observaciones: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
