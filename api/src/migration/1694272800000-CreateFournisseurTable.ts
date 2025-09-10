import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateFournisseurTable1694272800000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "fournisseur",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "uuid"
                    },
                    {
                        name: "nom",
                        type: "varchar",
                        isNullable: false
                    },
                    {
                        name: "contact",
                        type: "varchar",
                        isNullable: true
                    },
                    {
                        name: "email",
                        type: "varchar",
                        isNullable: true
                    },
                    {
                        name: "telephone",
                        type: "varchar",
                        isNullable: true
                    },
                    {
                        name: "adresse",
                        type: "varchar",
                        isNullable: true
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP"
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        onUpdate: "CURRENT_TIMESTAMP"
                    }
                ]
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("fournisseur");
    }
}
