import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Mouvement } from './Mouvement';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @Column({ unique: true, nullable: true })
  code_barres?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Mouvement, mouvement => mouvement.article)
  mouvements?: Mouvement[];
}
