import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Article } from '../entities/Article';
import { Mouvement } from '../entities/Mouvement';
import { authMiddleware } from '../middleware/auth';
import { QueryFailedError } from 'typeorm';
import { realtimeService } from '../services/realtime';

const router = Router();

// Delete article avec options de suppression forcée
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query; // Paramètre pour forcer la suppression
    console.log(`Tentative de suppression de l'article avec l'ID: ${id}, force: ${force}`);
    
    if (!AppDataSource.isInitialized) {
      throw new Error('La connexion à la base de données n\'est pas initialisée');
    }

    const articleRepository = AppDataSource.getRepository(Article);
    const mouvementRepository = AppDataSource.getRepository(Mouvement);

    // Vérifier si l'article existe
    const article = await articleRepository.findOne({
      where: { id },
      relations: ['mouvements']
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

    if (mouvementsCount > 0 && force !== 'true') {
      // Si il y a des mouvements et pas de force, retourner une erreur avec options
      return res.status(409).json({
        message: 'Impossible de supprimer l\'article car il a des mouvements associés',
        details: `${mouvementsCount} mouvements trouvés`,
        options: {
          forceDelete: true,
          message: 'Vous pouvez forcer la suppression en incluant ?force=true dans votre requête',
          warning: 'Attention: Cela supprimera définitivement tous les mouvements associés !'
        }
      });
    }

    // Suppression avec ou sans mouvements
    await AppDataSource.transaction(async manager => {
      if (mouvementsCount > 0) {
        console.log(`Suppression forcée : suppression de ${mouvementsCount} mouvements associés`);
        
        // Supprimer d'abord tous les mouvements associés
        await manager
          .createQueryBuilder()
          .delete()
          .from(Mouvement)
          .where('article_id = :articleId', { articleId: id })
          .execute();

        console.log('Mouvements associés supprimés');
      }

      // Supprimer l'article
      await manager.remove(article);
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

  } catch (error) {
    console.error('Delete article error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof QueryFailedError) {
      console.error('Détails de l\'erreur SQL:', {
        message: error.message,
        query: error.query,
        parameters: error.parameters
      });
    }
    
    res.status(500).json({ 
      message: 'Erreur lors de la suppression de l\'article',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;