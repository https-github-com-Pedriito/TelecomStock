import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nom!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ nullable: true })
  contact_email?: string;

  @Column({ type: 'varchar', nullable: true })
  stripe_customer_id?: string | null;

  @Column({ type: 'varchar', nullable: true })
  stripe_subscription_id?: string | null;

  @Column({ type: 'varchar', nullable: true })
  subscription_status?: string | null;

  @Column({ type: 'varchar', nullable: true })
  plan?: string | null;

  @Column({ type: 'int', default: 1 })
  seats!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
