import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Article } from '../entities/Article';
import { authMiddleware } from '../middleware/auth';
import { QueryFailedError } from 'typeorm';

const router = Router();

// Get all articles
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

// Get article by ID
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

// Create article
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

// Update article
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const articleRepository = AppDataSource.getRepository(Article);
    
    let article = await articleRepository.findOne({ where: { id } });
    if (!article) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    article = articleRepository.merge(article, req.body);
    await articleRepository.save(article);
    
    res.json(article);
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'article' });
  }
});

// Delete article
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Tentative de suppression de l'article avec l'ID: ${id}`);
    
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

    console.log(`Nombre de mouvements associés: ${mouvementsCount}`);

    if (mouvementsCount > 0) {
      console.log(`L'article ${id} a ${mouvementsCount} mouvements associés, impossible de le supprimer`);
      return res.status(400).json({
        message: 'Impossible de supprimer l\'article car il a des mouvements associés',
        details: `${mouvementsCount} mouvements trouvés`
      });
    }

    try {
      console.log('Tentative de suppression de l\'article...', article);
      await articleRepository.remove(article);
      console.log('Article supprimé avec succès');
      res.status(204).send();
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
