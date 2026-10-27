import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import type { KitLigne } from './KitLigne';

/**
 * Un kit est une nomenclature : un code commercial (ex. KIT-NAT-DIR) dont la
 * sortie du stock déduit automatiquement chacun de ses composants.
 *
 * La relation vers les lignes est volontairement UNIDIRECTIONNELLE : seule
 * KitLigne déclare son `@ManyToOne(() => Kit)`. Un `@OneToMany` ici obligerait
 * Kit à importer KitLigne, qui importe déjà Kit — et ce cycle casse le bundle
 * serveur de Next ("Cannot access 'l' before initialization"). Le contourner
 * par un nom d'entité en chaîne (`@ManyToOne('Kit', …)`) ne marche pas non
 * plus : le build de production minifie les noms de classe, et TypeORM ne
 * retrouve alors plus l'entité ("Entity metadata for l#kit was not found").
 *
 * Les lignes sont donc chargées explicitement par `chargerLignesDesKits`
 * (lib/kitsRepo.ts) et déposées dans le champ ci-dessous, qui n'est pas une
 * colonne et n'est jamais persisté.
 */
@Entity('kits')
@Index(['tenant_id', 'code'], { unique: true })
export class Kit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  tenant_id!: string;

  /** Code imprimé dans le QR code, ex. KIT-NAT-DIR */
  @Column()
  code!: string;

  @Column()
  nom!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  est_actif!: boolean;

  /** Rempli à la lecture par chargerLignesDesKits. Pas une colonne. */
  lignes?: KitLigne[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
