import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('articles')
@Index(['tenant_id', 'code_barres'], { unique: true, where: 'code_barres IS NOT NULL' })
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  tenant_id!: string;

  @Column()
  nom!: string;

  @Column({ nullable: true })
  categorie?: string;

  @Column({ nullable: true })
  fournisseur?: string;

  @Column({ nullable: true })
  localisation?: string;

  @Column({ default: 0 })
  seuil_minimum!: number;

  @Column({ default: 0 })
  quantite_stock!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  prix_unitaire?: number;

  @Column({ nullable: true })
  code_barres?: string;

  @Column({ nullable: true })
  image_url?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
