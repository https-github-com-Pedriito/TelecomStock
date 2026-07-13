import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Article } from './Article';

export enum MouvementType {
  ENTREE = 'ENTREE',
  SORTIE = 'SORTIE',
}

@Entity('mouvements')
export class Mouvement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  tenant_id!: string;

  @ManyToOne(() => Article)
  @JoinColumn({ name: 'article_id' })
  article!: Article;

  @Column()
  quantite!: number;

  @Column({ type: 'enum', enum: MouvementType })
  type!: MouvementType;

  @Column()
  utilisateur!: string;

  @Column({ nullable: true })
  projet?: string;

  @Column({ nullable: true })
  technicien?: string;

  @Column({ nullable: true })
  commentaire?: string;

  @Column({ type: 'timestamp', name: 'dateheure', default: () => 'CURRENT_TIMESTAMP' })
  dateHeure!: Date;

  @CreateDateColumn()
  created_at!: Date;
}
