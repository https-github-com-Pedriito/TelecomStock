import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateLocalisationTable1696867200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer la table localisations
    await queryRunner.createTable(
      new Table({
        name: 'localisations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'nom',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'est_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Insérer les localisations par défaut
    const localisations = [
      { nom: 'Entrepôt principal', description: 'Entrepôt principal de stockage', type: 'ENTREPOT' },
      { nom: 'Entrepôt secondaire', description: 'Entrepôt secondaire de stockage', type: 'ENTREPOT' },
      { nom: 'Magasin central', description: 'Magasin central de distribution', type: 'ENTREPOT' },
      { nom: 'Véhicule Technicien 1', description: 'Véhicule du technicien 1', type: 'VEHICULE' },
      { nom: 'Véhicule Technicien 2', description: 'Véhicule du technicien 2', type: 'VEHICULE' },
      { nom: 'Véhicule Technicien 3', description: 'Véhicule du technicien 3', type: 'VEHICULE' },
      { nom: 'Camion d\'intervention', description: 'Camion d\'intervention mobile', type: 'VEHICULE' },
      { nom: 'Site client - Paris', description: 'Site client à Paris', type: 'SITE_CLIENT' },
      { nom: 'Site client - Lyon', description: 'Site client à Lyon', type: 'SITE_CLIENT' },
      { nom: 'Site client - Marseille', description: 'Site client à Marseille', type: 'SITE_CLIENT' },
      { nom: 'Site client - Toulouse', description: 'Site client à Toulouse', type: 'SITE_CLIENT' },
      { nom: 'Antenne relais A', description: 'Antenne relais site A', type: 'TECHNIQUE' },
      { nom: 'Antenne relais B', description: 'Antenne relais site B', type: 'TECHNIQUE' },
      { nom: 'Centre technique', description: 'Centre technique principal', type: 'TECHNIQUE' },
      { nom: 'Bureau commercial', description: 'Bureau commercial et administratif', type: 'AUTRE' },
      { nom: 'Stock de sécurité', description: 'Stock de sécurité d\'urgence', type: 'ENTREPOT' },
      { nom: 'En transit', description: 'Matériel en cours de transport', type: 'AUTRE' },
      { nom: 'Chez le fournisseur', description: 'Matériel chez le fournisseur', type: 'AUTRE' },
      { nom: 'Retour SAV', description: 'Matériel en retour SAV', type: 'AUTRE' },
      { nom: 'Zone de réparation', description: 'Zone de réparation et maintenance', type: 'TECHNIQUE' },
    ];

    for (const localisation of localisations) {
      await queryRunner.query(
        `INSERT INTO localisations (nom, description, type) VALUES ($1, $2, $3)`,
        [localisation.nom, localisation.description, localisation.type]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('localisations');
  }
}