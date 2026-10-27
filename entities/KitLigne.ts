import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Article } from './Article';
import { Kit } from './Kit';

/** Une ligne de nomenclature : N unités d'un article dans un kit. */
@Entity('kit_lignes')
@Index(['kit_id'])
export class KitLigne {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  kit_id!: string;

  /**
   * Référence par classe, et non par nom en chaîne : le build de production
   * minifie les noms de classe, donc `@ManyToOne('Kit', …)` ne se résout plus
   * à l'exécution. L'import de Kit est sans danger car Kit ne déclare aucun
   * `@OneToMany` en retour : il n'y a pas de cycle d'imports.
   */
  @ManyToOne(() => Kit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kit_id' })
  kit!: Kit;

  @Column({ type: 'uuid' })
  article_id!: string;

  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article!: Article;

  /**
   * Quantité de cet article consommée par UN kit.
   * Entier, comme Article.quantite_stock et Mouvement.quantite : un article
   * vendu au mètre (câble) se compte en mètres, pas en fractions d'unité.
   */
  @Column({ type: 'int', default: 1 })
  quantite!: number;
}
