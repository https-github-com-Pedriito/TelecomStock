import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddImageUrlToArticle1730930000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('articles', new TableColumn({
            name: 'image_url',
            type: 'varchar',
            isNullable: true
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('articles', 'image_url');
    }
}
