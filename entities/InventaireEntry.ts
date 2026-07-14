import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Article } from './Article';
import { Inventaire } from './Inventaire';

@Entity('inventaire_entry')
export class InventaireEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  tenant_id!: string;

  @Column('uuid')
  inventaire_id!: string;

  @ManyToOne(() => Inventaire)
  @JoinColumn({ name: 'inventaire_id' })
  inventaire!: Inventaire;

  @Column('uuid')
  article_id!: string;

  @ManyToOne(() => Article)
  @JoinColumn({ name: 'article_id' })
  article!: Article;

  @Column()
  quantite_comptee!: number;

  @Column()
  quantite_theorique!: number;

  @Column('uuid')
  utilisateur_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur!: User;

  @Column({ nullable: true })
  commentaire!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
