import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateInventaireAndEntryTables1726923456789 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Créer la table inventaire
        await queryRunner.createTable(new Table({
            name: 'inventaire',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'gen_random_uuid()'
                },
                {
                    name: 'nom',
                    type: 'varchar',
                    length: '255'
                },
                {
                    name: 'description',
                    type: 'text'
                },
                {
                    name: 'statut',
                    type: 'enum',
                    enum: ['EN_COURS', 'FINALISE', 'ARCHIVE'],
                    default: "'EN_COURS'"
                },
                {
                    name: 'mois',
                    type: 'integer'
                },
                {
                    name: 'annee',
                    type: 'integer'
                },
                {
                    name: 'created_by_user_id',
                    type: 'uuid'
                },
                {
                    name: 'finalized_by_user_id',
                    type: 'uuid',
                    isNullable: true
                },
                {
                    name: 'finalized_at',
                    type: 'timestamp',
                    isNullable: true
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'now()'
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'now()'
                }
            ]
        }));

        // Créer la table inventaire_entry
        await queryRunner.createTable(new Table({
            name: 'inventaire_entry',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'gen_random_uuid()'
                },
                {
                    name: 'inventaire_id',
                    type: 'uuid'
                },
                {
                    name: 'article_id',
                    type: 'uuid'
                },
                {
                    name: 'quantite_comptee',
                    type: 'integer'
                },
                {
                    name: 'quantite_theorique',
                    type: 'integer'
                },
                {
                    name: 'utilisateur_id',
                    type: 'uuid'
                },
                {
                    name: 'commentaire',
                    type: 'text',
                    isNullable: true
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'now()'
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'now()'
                }
            ]
        }));

        // Ajouter les clés étrangères pour inventaire
        await queryRunner.createForeignKey('inventaire', new TableForeignKey({
            columnNames: ['created_by_user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
        }));

        await queryRunner.createForeignKey('inventaire', new TableForeignKey({
            columnNames: ['finalized_by_user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL'
        }));

        // Ajouter les clés étrangères pour inventaire_entry
        await queryRunner.createForeignKey('inventaire_entry', new TableForeignKey({
            columnNames: ['inventaire_id'],
            referencedTableName: 'inventaire',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
        }));

        await queryRunner.createForeignKey('inventaire_entry', new TableForeignKey({
            columnNames: ['article_id'],
            referencedTableName: 'articles',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
        }));

        await queryRunner.createForeignKey('inventaire_entry', new TableForeignKey({
            columnNames: ['utilisateur_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
        }));

        // Ajouter des index pour améliorer les performances
        await queryRunner.createIndex('inventaire', new TableIndex({
            name: 'IDX_inventaire_statut',
            columnNames: ['statut']
        }));
        
        await queryRunner.createIndex('inventaire', new TableIndex({
            name: 'IDX_inventaire_mois_annee',
            columnNames: ['mois', 'annee']
        }));
        
        await queryRunner.createIndex('inventaire_entry', new TableIndex({
            name: 'IDX_inventaire_entry_inventaire_id',
            columnNames: ['inventaire_id']
        }));
        
        await queryRunner.createIndex('inventaire_entry', new TableIndex({
            name: 'IDX_inventaire_entry_article_id',
            columnNames: ['article_id']
        }));
        
        // Index unique pour éviter les doublons utilisateur/article dans le même inventaire
        await queryRunner.createIndex('inventaire_entry', new TableIndex({
            name: 'IDX_inventaire_entry_unique',
            columnNames: ['inventaire_id', 'article_id', 'utilisateur_id'],
            isUnique: true
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Supprimer les index
        await queryRunner.dropIndex('inventaire_entry', 'IDX_inventaire_entry_unique');
        await queryRunner.dropIndex('inventaire_entry', 'IDX_inventaire_entry_article_id');
        await queryRunner.dropIndex('inventaire_entry', 'IDX_inventaire_entry_inventaire_id');
        await queryRunner.dropIndex('inventaire', 'IDX_inventaire_mois_annee');
        await queryRunner.dropIndex('inventaire', 'IDX_inventaire_statut');

        // Supprimer les tables (les clés étrangères seront supprimées automatiquement)
        await queryRunner.dropTable('inventaire_entry');
        await queryRunner.dropTable('inventaire');
    }
}