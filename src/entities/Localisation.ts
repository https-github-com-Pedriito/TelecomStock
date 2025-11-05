import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('localisations')
export class Localisation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  nom!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  type?: string; // 'ENTREPOT', 'VEHICULE', 'SITE_CLIENT', 'TECHNIQUE', 'AUTRE'

  @Column({ default: true })
  est_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}