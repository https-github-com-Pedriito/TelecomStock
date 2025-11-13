import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Article } from '../entities/Article';
import { authMiddleware } from '../middleware/auth';
import { QueryFailedError } from 'typeorm';
import { realtimeService } from '../services/realtime';

const router = Router();

/**
 * @swagger
 * /articles:
 *   get:
 *     summary: Récupérer tous les articles
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des articles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Article'
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('GET /articles - Récupération de tous les articles');
    console.log('État de la connexion à la base de données:', AppDataSource.isInitialized ? 'Initialisée' : 'Non initialisée');
    
    if (!AppDataSource.isInitialized) {
      throw new Error('La connexion à la base de données n\'est pas initialisée');
    }

    const articleRepository = AppDataSource.getRepository(Article);
    console.log('Repository article récupéré');

    try {
      console.log('Exécution de la requête à la base de données...');
      const articles = await articleRepository.find({
        order: {
          nom: 'ASC'
        }
      });
      console.log(`${articles.length} articles récupérés depuis la base de données`);
      res.json(articles);
    } catch (queryError) {
      console.error('Erreur lors de l\'exécution de la requête:', queryError);
      if (queryError instanceof QueryFailedError) {
        console.error('Détails de l\'erreur SQL:', {
          message: queryError.message,
          query: queryError.query,
          parameters: queryError.parameters
        });
      }
      throw queryError;
    }
  } catch (error) {
    console.error('Get articles error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    if (error instanceof Error) {
      console.error('Message d\'erreur détaillé:', error.message);
    }
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des articles',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * @swagger
 * /articles/{id}:
 *   get:
 *     summary: Récupérer un article par ID
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'article
 *     responses:
 *       200:
 *         description: Article trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       404:
 *         description: Article non trouvé
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const articleRepository = AppDataSource.getRepository(Article);
    
    console.log(`Recherche de l'article avec l'ID: ${id}`);
    const article = await articleRepository.findOne({ where: { id } });

    if (!article) {
      console.log(`Article avec l'ID ${id} non trouvé`);
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    console.log('Article trouvé:', article);
    res.json(article);
  } catch (error) {
    console.error('Get article error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      message: 'Erreur lors de la récupération de l\'article',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * @swagger
 * /articles:
 *   post:
 *     summary: Créer un nouvel article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *               - reference
 *               - quantite
 *             properties:
 *               nom:
 *                 type: string
 *                 example: Cable RJ45 Cat6
 *               reference:
 *                 type: string
 *                 example: CAB-RJ45-C6-001
 *               quantite:
 *                 type: integer
 *                 example: 100
 *               prix:
 *                 type: number
 *                 example: 5.99
 *               description:
 *                 type: string
 *               categorie:
 *                 type: string
 *               seuil_alerte:
 *                 type: integer
 *               localisation_id:
 *                 type: string
 *               fournisseur_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Article créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       400:
 *         description: Données invalides
 *       409:
 *         description: La référence existe déjà
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('Création d\'un nouvel article:', req.body);
    const articleRepository = AppDataSource.getRepository(Article);
    
    // Création de l'entité
    const article = articleRepository.create(req.body);
    console.log('Entité article créée:', article);
    
    // Sauvegarde dans la base de données
    const savedArticle = await articleRepository.save(article);
    console.log('Article sauvegardé:', savedArticle);
    
    // Notification en temps réel
    realtimeService.notifyDatabaseChange({
      type: 'create',
      table: 'article',
      data: savedArticle,
      id: (savedArticle as any).id,
      timestamp: new Date(),
      userId: req.user?.id
    });
    
    res.status(201).json(savedArticle);
  } catch (error) {
    console.error('Create article error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      message: 'Erreur lors de la création de l\'article',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * @swagger
 * /articles/{id}:
 *   put:
 *     summary: Mettre à jour un article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'article
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Article'
 *     responses:
 *       200:
 *         description: Article mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       404:
 *         description: Article non trouvé
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const articleRepository = AppDataSource.getRepository(Article);
    
    let article = await articleRepository.findOne({ where: { id } });
    if (!article) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    article = articleRepository.merge(article, req.body);
    const updatedArticle = await articleRepository.save(article);
    
    // Notification en temps réel
    realtimeService.notifyDatabaseChange({
      type: 'update',
      table: 'article',
      data: updatedArticle,
      id: article.id,
      timestamp: new Date(),
      userId: req.user?.id
    });
    
    res.json(updatedArticle);
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'article' });
  }
});

/**
 * @swagger
 * /articles/{id}:
 *   delete:
 *     summary: Supprimer un article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'article
 *     responses:
 *       200:
 *         description: Article supprimé
 *       404:
 *         description: Article non trouvé
 */
// Delete article
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query; // Paramètre pour forcer la suppression
    console.log(`Tentative de suppression de l'article avec l'ID: ${id}, force: ${force}`);
    
    if (!AppDataSource.isInitialized) {
      throw new Error('La connexion à la base de données n\'est pas initialisée');
    }

    const articleRepository = AppDataSource.getRepository(Article);
    console.log('Repository article récupéré');

    // Rechercher l'article et ses mouvements associés
    const mouvementRepository = AppDataSource.getRepository('mouvements');
    
    // Vérifier si l'article existe
    const article = await articleRepository.findOne({
      where: { id }
    });

    if (!article) {
      console.log(`Article avec l'ID ${id} non trouvé`);
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    // Vérifier s'il y a des mouvements associés
    const mouvementsCount = await mouvementRepository
      .createQueryBuilder('mouvement')
      .where('mouvement.article_id = :articleId', { articleId: id })
      .getCount();

    if (mouvementsCount > 0 && force !== 'true') {
      // Si il y a des mouvements et pas de force, retourner une erreur avec options
      return res.status(409).json({
        message: 'Impossible de supprimer l\'article car il a des mouvements associés',
        details: `${mouvementsCount} mouvements trouvés`,
        options: {
          forceDelete: true,
          message: 'Vous pouvez forcer la suppression qui supprimera aussi tous les mouvements associés',
          warning: '⚠️  Attention: Cela supprimera définitivement tous les mouvements associés !'
        }
      });
    }

    try {
      // Suppression avec transaction pour garantir l'intégrité
      await AppDataSource.transaction(async manager => {
        if (mouvementsCount > 0) {
          console.log(`Suppression forcée : suppression de ${mouvementsCount} mouvements associés`);
          
          // Supprimer d'abord tous les mouvements associés
          await manager
            .createQueryBuilder()
            .delete()
            .from('mouvements')
            .where('article_id = :articleId', { articleId: id })
            .execute();

          console.log('Mouvements associés supprimés');
        }

        // Supprimer l'article
        await manager.remove(Article, article);
        console.log('Article supprimé avec succès');
      });
      
      // Notification en temps réel
      realtimeService.notifyDatabaseChange({
        type: 'delete',
        table: 'article',
        data: { 
          ...article, 
          mouvementsSupprimes: mouvementsCount,
          suppressionForcee: force === 'true'
        },
        id: article.id,
        timestamp: new Date(),
        userId: req.user?.id
      });
      
      res.json({
        message: 'Article supprimé avec succès',
        mouvementsSupprimes: mouvementsCount,
        suppressionForcee: force === 'true'
      });
    } catch (deleteError) {
      console.error('Erreur lors de la suppression :', deleteError);
      throw deleteError;
    }
  } catch (error) {
    console.error('Delete article error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof QueryFailedError) {
      console.error('Détails de l\'erreur SQL:', {
        message: error.message,
        query: error.query,
        parameters: error.parameters
      });
      
      return res.status(400).json({ 
        message: 'Erreur SQL lors de la suppression de l\'article',
        error: error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Erreur lors de la suppression de l\'article',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export const articlesRouter = router;
