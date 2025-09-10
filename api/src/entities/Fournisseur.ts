import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity("fournisseur")
export class Fournisseur {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  nom!: string;

  @Column({ nullable: true })
  contact!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  telephone!: string;

  @Column({ nullable: true })
  adresse!: string;

  @Column({ 
    name: "created_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP"
  })
  createdAt!: Date;

  @Column({ 
    name: "updated_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP"
  })
  updatedAt!: Date;
}
