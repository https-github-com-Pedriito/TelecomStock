import { Router } from 'express';
import { Mouvement } from '../entities/Mouvement';
import { Article } from '../entities/Article';
import { authMiddleware } from '../middleware/auth';
import { AppDataSource } from '../data-source';

const router = Router();

/**
 * @swagger
 * /mouvements:
 *   get:
 *     summary: Récupérer tous les mouvements
 *     tags: [Mouvements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des mouvements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mouvement'
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const mouvementRepository = AppDataSource.getRepository(Mouvement);
    const mouvements = await mouvementRepository.find({
      relations: ['article']
    });
    res.json(mouvements);
  } catch (error) {
    console.error('Get mouvements error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des mouvements' });
  }
});

/**
 * @swagger
 * /mouvements/{id}:
 *   get:
 *     summary: Récupérer un mouvement par ID
 *     tags: [Mouvements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Mouvement trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mouvement'
 *       404:
 *         description: Mouvement non trouvé
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const mouvementRepository = AppDataSource.getRepository(Mouvement);
    const mouvement = await mouvementRepository.findOne({
      where: { id },
      relations: ['article']
    });

    if (!mouvement) {
      return res.status(404).json({ message: 'Mouvement non trouvé' });
    }

    res.json(mouvement);
  } catch (error) {
    console.error('Get mouvement error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du mouvement' });
  }
});

/**
 * @swagger
 * /mouvements:
 *   post:
 *     summary: Créer un nouveau mouvement de stock
 *     tags: [Mouvements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - article_id
 *               - type
 *               - quantite
 *             properties:
 *               article_id:
 *                 type: integer
 *                 example: 1
 *               type:
 *                 type: string
 *                 enum: [entree, sortie]
 *                 example: entree
 *               quantite:
 *                 type: integer
 *                 example: 10
 *               commentaire:
 *                 type: string
 *                 example: Réception fournisseur
 *     responses:
 *       201:
 *         description: Mouvement créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mouvement'
 *       400:
 *         description: Données invalides
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('=== CRÉATION MOUVEMENT ===');
    console.log('Body reçu:', JSON.stringify(req.body, null, 2));
    
    if (!AppDataSource.isInitialized) {
      throw new Error('La connexion à la base de données n\'est pas initialisée');
    }
    
    const mouvementRepository = AppDataSource.getRepository(Mouvement);
    const articleRepository = AppDataSource.getRepository(Article);

    const { articleId, article_id, type, quantite, utilisateur, projet, technicien, commentaire } = req.body;
    
    // Support des deux formats: articleId ou article_id
    const finalArticleId = articleId || article_id;

    // Validation des données requises
    if (!finalArticleId) {
      console.error('ArticleId manquant');
      return res.status(400).json({ message: 'articleId ou article_id est requis' });
    }
    
    if (!type || !['ENTREE', 'SORTIE'].includes(type)) {
      console.error('Type invalide:', type);
      return res.status(400).json({ message: 'Type doit être ENTREE ou SORTIE' });
    }
    
    if (!quantite || quantite <= 0) {
      console.error('Quantité invalide:', quantite);
      return res.status(400).json({ message: 'Quantité doit être positive' });
    }

    console.log('Données validées:', { finalArticleId, type, quantite, utilisateur, projet, technicien, commentaire });

    // Récupérer prénom et nom depuis le token utilisateur si disponible
    let utilisateurNom = utilisateur;
    console.log('🔍 Debug utilisateur reçu dans le body:', JSON.stringify(utilisateur));
    console.log('🔍 Debug informations du token req.user:', JSON.stringify(req.user));
    
    // Vérifier si l'utilisateur transmis est valide (pas vide, pas juste des espaces)
    const isUtilisateurValide = utilisateurNom && 
                               typeof utilisateurNom === 'string' && 
                               utilisateurNom.trim().length > 0 &&
                               utilisateurNom.trim() !== 'undefined undefined' &&
                               !utilisateurNom.includes('undefined');
    
    if (isUtilisateurValide) {
      // Utilise la valeur reçue, nettoyée
      utilisateurNom = utilisateurNom.trim();
      console.log('✅ Utilisation du nom transmis:', utilisateurNom);
    } else if (req.user && req.user.prenom && req.user.nom) {
      // Sinon, utilise le nom/prénom du token
      utilisateurNom = `${req.user.prenom} ${req.user.nom}`;
      console.log('✅ Utilisation du nom du token:', utilisateurNom);
    } else {
      utilisateurNom = 'Utilisateur inconnu';
      console.log('❌ Aucun nom valide trouvé, utilisation de "Utilisateur inconnu"');
    }
    console.log('🎯 Utilisateur final utilisé:', utilisateurNom);

    // Vérifier que l'article existe
    const article = await articleRepository.findOne({ where: { id: finalArticleId } });
    if (!article) {
      console.error('Article non trouvé:', finalArticleId);
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    console.log('Article trouvé:', article.nom);

    // Vérifier le stock pour les sorties
    if (type === 'SORTIE' && article.quantite_stock < quantite) {
      console.error('Stock insuffisant:', { stock: article.quantite_stock, demande: quantite });
      return res.status(400).json({ message: 'Stock insuffisant' });
    }

    // Créer le mouvement
    const mouvementData = {
      article,
      type,
      quantite: Number(quantite),
      utilisateur: utilisateurNom,
      projet,
      technicien,
      commentaire,
      dateHeure: new Date()
    };

    console.log('Création du mouvement avec les données:', mouvementData);

    const mouvement = mouvementRepository.create(mouvementData);
    console.log('Entité mouvement créée');
    
    const savedMouvement = await mouvementRepository.save(mouvement);
    console.log('Mouvement sauvegardé avec ID:', savedMouvement.id);

    // Mettre à jour le stock de l'article
    const oldStock = article.quantite_stock;
    article.quantite_stock += type === 'ENTREE' ? Number(quantite) : -Number(quantite);
    console.log(`Mise à jour du stock: ${oldStock} -> ${article.quantite_stock} (${type} de ${quantite})`);
    
    await articleRepository.save(article);
    console.log('Stock de l\'article mis à jour');

    console.log('=== MOUVEMENT CRÉÉ AVEC SUCCÈS ===');
    res.json(savedMouvement);
  } catch (error) {
    console.error('=== ERREUR CRÉATION MOUVEMENT ===');
    console.error('Create mouvement error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      message: 'Erreur lors de la création du mouvement',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * @swagger
 * /mouvements/{id}:
 *   delete:
 *     summary: Supprimer un mouvement par ID
 *     tags: [Mouvements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du mouvement à supprimer
 *     responses:
 *       200:
 *         description: Mouvement supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mouvement supprimé avec succès
 *       404:
 *         description: Mouvement non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('=== SUPPRESSION MOUVEMENT ===');
    console.log('ID du mouvement:', id);

    const mouvementRepository = AppDataSource.getRepository(Mouvement);
    const articleRepository = AppDataSource.getRepository(Article);

    // Récupérer le mouvement avec l'article associé
    const mouvement = await mouvementRepository.findOne({
      where: { id },
      relations: ['article']
    });

    if (!mouvement) {
      console.log('Mouvement non trouvé');
      return res.status(404).json({ message: 'Mouvement non trouvé' });
    }

    console.log('Mouvement trouvé:', {
      type: mouvement.type,
      quantite: mouvement.quantite,
      article: mouvement.article?.nom
    });

    // Annuler l'impact du mouvement sur le stock
    if (mouvement.article) {
      const oldStock = mouvement.article.quantite_stock;
      // Si c'était une entrée, on retire la quantité. Si c'était une sortie, on remet la quantité
      if (mouvement.type === 'ENTREE') {
        mouvement.article.quantite_stock -= mouvement.quantite;
      } else if (mouvement.type === 'SORTIE') {
        mouvement.article.quantite_stock += mouvement.quantite;
      }
      
      console.log(`Restauration du stock: ${oldStock} -> ${mouvement.article.quantite_stock}`);
      await articleRepository.save(mouvement.article);
      console.log('Stock restauré');
    }

    // Supprimer le mouvement
    await mouvementRepository.remove(mouvement);
    console.log('=== MOUVEMENT SUPPRIMÉ AVEC SUCCÈS ===');

    res.json({ 
      message: 'Mouvement supprimé avec succès',
      stockRestored: mouvement.article ? true : false
    });
  } catch (error) {
    console.error('=== ERREUR SUPPRESSION MOUVEMENT ===');
    console.error('Delete mouvement error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du mouvement',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export const mouvementsRouter = router;
