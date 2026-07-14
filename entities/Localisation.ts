import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('localisations')
@Index(['tenant_id', 'nom'], { unique: true })
export class Localisation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  tenant_id!: string;

  @Column()
  nom!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  type?: string;

  @Column({ default: true })
  est_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
