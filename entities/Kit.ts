import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { KitLigne } from './KitLigne';

/**
 * Un kit est une nomenclature : un code commercial (ex. KIT-NAT-DIR) dont la
 * sortie du stock déduit automatiquement chacun de ses composants.
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

  @OneToMany(() => KitLigne, ligne => ligne.kit, { cascade: true, eager: false })
  lignes!: KitLigne[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
