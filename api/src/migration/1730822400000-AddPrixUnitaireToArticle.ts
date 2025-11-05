import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPrixUnitaireToArticle1730822400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'articles',
      new TableColumn({
        name: 'prix_unitaire',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
        default: 0,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('articles', 'prix_unitaire');
  }
}
