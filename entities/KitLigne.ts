import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, type Relation } from 'typeorm';
import { Article } from './Article';
import type { Kit } from './Kit';

/** Une ligne de nomenclature : N unités d'un article dans un kit. */
@Entity('kit_lignes')
@Index(['kit_id'])
export class KitLigne {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  kit_id!: string;

  /**
   * Kit parent, référencé par son NOM d'entité et non par la classe.
   *
   * Kit déclare déjà `@OneToMany(() => KitLigne)` : importer la classe Kit ici
   * refermerait le cycle d'imports, et le bundler serveur de Next évalue alors
   * `Kit` avant son initialisation ("Cannot access 'l' before initialization").
   * Le nom en chaîne est résolu par TypeORM au moment de construire les
   * metadata, bien après le chargement des modules.
   */
  @ManyToOne('Kit', 'lignes', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kit_id' })
  kit!: Relation<Kit>;

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
