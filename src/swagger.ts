import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Decimale Stock',
      version: '1.0.0',
      description: 'API de gestion de stock pour votre entreprise',
      contact: {
        name: 'Decimale Stock Support',
        email: 'promer@decimale.net',
      },
    },
    servers: [
      {
        url: 'http://localhost:3080',
        description: 'Serveur de développement HTTP',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentification et gestion des sessions' },
      { name: 'Articles', description: 'Gestion des articles en stock' },
      { name: 'Mouvements', description: 'Gestion des mouvements de stock' },
      { name: 'Users', description: 'Gestion des utilisateurs' },
      { name: 'Fournisseurs', description: 'Gestion des fournisseurs' },
      { name: 'Inventaires', description: 'Gestion des inventaires' },
      { name: 'Localisations', description: 'Gestion des localisations' },
      { name: 'Assistant', description: 'Assistant IA pour le stock' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Message d\'erreur',
            },
            message: {
              type: 'string',
              description: 'Détails de l\'erreur',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID de l\'utilisateur',
            },
            username: {
              type: 'string',
              description: 'Nom d\'utilisateur',
            },
            email: {
              type: 'string',
              description: 'Email de l\'utilisateur',
            },
            role: {
              type: 'string',
              enum: ['admin', 'tech', 'user'],
              description: 'Rôle de l\'utilisateur',
            },
            firstName: {
              type: 'string',
              description: 'Prénom',
            },
            lastName: {
              type: 'string',
              description: 'Nom',
            },
          },
        },
        Article: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID de l\'article',
            },
            nom: {
              type: 'string',
              description: 'Nom de l\'article',
            },
            reference: {
              type: 'string',
              description: 'Référence unique',
            },
            quantite: {
              type: 'integer',
              description: 'Quantité en stock',
            },
            prix: {
              type: 'number',
              format: 'float',
              description: 'Prix unitaire',
            },
            description: {
              type: 'string',
              description: 'Description de l\'article',
            },
            categorie: {
              type: 'string',
              description: 'Catégorie',
            },
            seuil_alerte: {
              type: 'integer',
              description: 'Seuil d\'alerte',
            },
            localisation_id: {
              type: 'integer',
              description: 'ID de la localisation',
            },
            fournisseur_id: {
              type: 'integer',
              description: 'ID du fournisseur',
            },
          },
        },
        Mouvement: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID du mouvement',
            },
            type: {
              type: 'string',
              enum: ['entree', 'sortie'],
              description: 'Type de mouvement',
            },
            quantite: {
              type: 'integer',
              description: 'Quantité',
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'Date du mouvement',
            },
            commentaire: {
              type: 'string',
              description: 'Commentaire',
            },
            article_id: {
              type: 'integer',
              description: 'ID de l\'article',
            },
            user_id: {
              type: 'integer',
              description: 'ID de l\'utilisateur',
            },
          },
        },
        Fournisseur: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID du fournisseur',
            },
            nom: {
              type: 'string',
              description: 'Nom du fournisseur',
            },
            contact: {
              type: 'string',
              description: 'Contact',
            },
            email: {
              type: 'string',
              description: 'Email',
            },
            telephone: {
              type: 'string',
              description: 'Téléphone',
            },
            adresse: {
              type: 'string',
              description: 'Adresse',
            },
          },
        },
        Localisation: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID de la localisation',
            },
            nom: {
              type: 'string',
              description: 'Nom de la localisation',
            },
            description: {
              type: 'string',
              description: 'Description',
            },
            actif: {
              type: 'boolean',
              description: 'État actif/inactif',
            },
          },
        },
        Inventaire: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID de l\'inventaire',
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'Date de l\'inventaire',
            },
            statut: {
              type: 'string',
              enum: ['en_cours', 'termine'],
              description: 'Statut de l\'inventaire',
            },
            commentaire: {
              type: 'string',
              description: 'Commentaire',
            },
            user_id: {
              type: 'integer',
              description: 'ID de l\'utilisateur',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
