import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  TECHNICIEN = 'TECHNICIEN',
}

@Entity('users')
@Index(['tenant_id', 'email'], { unique: true })
@Index(['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // null pour SUPER_ADMIN (pas de tenant)
  @Column({ type: 'varchar', nullable: true })
  tenant_id!: string | null;

  @Column()
  email!: string;

  @Column()
  password_hash!: string;

  @Column()
  nom!: string;

  @Column()
  prenom!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.TECHNICIEN })
  role!: UserRole;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  reset_requested_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
