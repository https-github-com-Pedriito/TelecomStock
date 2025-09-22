import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum InventoryStatus {
  EN_COURS = 'EN_COURS',
  FINALISE = 'FINALISE',
  ARCHIVE = 'ARCHIVE'
}

// Entité pour l'inventaire principal (session d'inventaire)
@Entity('inventaire')
export class Inventaire {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nom!: string; // Nom de l'inventaire (ex: "Inventaire Janvier 2024")

  @Column()
  description!: string;

  @Column({
    type: 'enum',
    enum: InventoryStatus,
    default: InventoryStatus.EN_COURS
  })
  statut!: InventoryStatus;

  @Column()
  mois!: number; // 1-12

  @Column()
  annee!: number;

  @Column('uuid')
  created_by_user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  created_by!: User;

  @Column({ nullable: true })
  finalized_by_user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'finalized_by_user_id' })
  finalized_by!: User;

  @Column({ nullable: true })
  finalized_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}