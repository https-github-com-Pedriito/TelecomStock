import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Inventaire, InventoryStatus } from '../entities/Inventaire';
import { InventaireEntry } from '../entities/InventaireEntry';
import { Article } from '../entities/Article';
import { User } from '../entities/User';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /inventaires - Récupérer tous les inventaires
router.get('/', authMiddleware, async (req, res) => {
  try {
    const inventaireRepository = AppDataSource.getRepository(Inventaire);
    const inventaires = await inventaireRepository.find({
      relations: ['created_by', 'finalized_by'],
      order: { created_at: 'DESC' }
    });
    res.json(inventaires);
  } catch (error) {
    console.error('Erreur lors de la récupération des inventaires:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des inventaires' });
  }
});

// GET /inventaires/current - Récupérer l'inventaire actuel en cours
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const inventaireRepository = AppDataSource.getRepository(Inventaire);
    const currentInventaire = await inventaireRepository.findOne({
      where: { statut: InventoryStatus.EN_COURS },
      relations: ['created_by']
    });
    
    res.json(currentInventaire);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'inventaire actuel:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'inventaire actuel' });
  }
});

// POST /inventaires - Créer un nouvel inventaire
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { nom, description, mois, annee } = req.body;
    const userId = (req as any).user.userId;

    // Vérifier qu'il n'y a pas déjà un inventaire en cours
    const inventaireRepository = AppDataSource.getRepository(Inventaire);
    const existingInventaire = await inventaireRepository.findOne({
      where: { statut: InventoryStatus.EN_COURS }
    });

    if (existingInventaire) {
      return res.status(400).json({ 
        message: 'Un inventaire est déjà en cours. Veuillez le finaliser avant d\'en créer un nouveau.' 
      });
    }

    const newInventaire = inventaireRepository.create({
      nom,
      description,
      mois,
      annee,
      created_by_user_id: userId,
      statut: InventoryStatus.EN_COURS
    });

    const savedInventaire = await inventaireRepository.save(newInventaire);
    
    // Retourner l'inventaire avec les relations
    const fullInventaire = await inventaireRepository.findOne({
      where: { id: savedInventaire.id },
      relations: ['created_by']
    });

    res.status(201).json(fullInventaire);
  } catch (error) {
    console.error('Erreur lors de la création de l\'inventaire:', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'inventaire' });
  }
});

// GET /inventaires/:id - Récupérer un inventaire spécifique
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const inventaireRepository = AppDataSource.getRepository(Inventaire);
    
    const inventaire = await inventaireRepository.findOne({
      where: { id },
      relations: ['created_by', 'finalized_by']
    });

    if (!inventaire) {
      return res.status(404).json({ message: 'Inventaire non trouvé' });
    }

    res.json(inventaire);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'inventaire:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'inventaire' });
  }
});

// GET /inventaires/:id/entries - Récupérer toutes les entrées d'un inventaire
router.get('/:id/entries', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const entryRepository = AppDataSource.getRepository(InventaireEntry);
    
    const entries = await entryRepository.find({
      where: { inventaire_id: id },
      relations: ['article', 'utilisateur'],
      order: { created_at: 'DESC' }
    });

    res.json(entries);
  } catch (error) {
    console.error('Erreur lors de la récupération des entrées d\'inventaire:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des entrées d\'inventaire' });
  }
});

// POST /inventaires/:id/entries - Ajouter une entrée à un inventaire
router.post('/:id/entries', authMiddleware, async (req, res) => {
  try {
    const { id: inventaireId } = req.params;
    const { article_id, quantite_comptee, commentaire } = req.body;
    const userId = (req as any).user.userId;

    // Vérifier que l'inventaire existe et est en cours
    const inventaireRepository = AppDataSource.getRepository(Inventaire);
    const inventaire = await inventaireRepository.findOne({
      where: { id: inventaireId, statut: InventoryStatus.EN_COURS }
    });

    if (!inventaire) {
      return res.status(404).json({ 
        message: 'Inventaire non trouvé ou non modifiable' 
      });
    }

    // Récupérer l'article pour obtenir le stock théorique
    const articleRepository = AppDataSource.getRepository(Article);
    const article = await articleRepository.findOne({
      where: { id: article_id }
    });

    if (!article) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    // Vérifier s'il existe déjà une entrée pour cet article par cet utilisateur
    const entryRepository = AppDataSource.getRepository(InventaireEntry);
    const existingEntry = await entryRepository.findOne({
      where: { 
        inventaire_id: inventaireId, 
        article_id: article_id,
        utilisateur_id: userId 
      }
    });

    let savedEntry;
    if (existingEntry) {
      // Mettre à jour l'entrée existante
      existingEntry.quantite_comptee = quantite_comptee;
      existingEntry.quantite_theorique = article.quantite_stock;
      existingEntry.commentaire = commentaire;
      savedEntry = await entryRepository.save(existingEntry);
    } else {
      // Créer une nouvelle entrée
      const newEntry = entryRepository.create({
        inventaire_id: inventaireId,
        article_id: article_id,
        quantite_comptee,
        quantite_theorique: article.quantite_stock,
        utilisateur_id: userId,
        commentaire
      });
      savedEntry = await entryRepository.save(newEntry);
    }

    // Retourner l'entrée avec les relations
    const fullEntry = await entryRepository.findOne({
      where: { id: savedEntry.id },
      relations: ['article', 'utilisateur']
    });

    res.json(fullEntry);
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'entrée d\'inventaire:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout de l\'entrée d\'inventaire' });
  }
});

// PUT /inventaires/:id/finalize - Finaliser un inventaire
router.put('/:id/finalize', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const inventaireRepository = AppDataSource.getRepository(Inventaire);
    const inventaire = await inventaireRepository.findOne({
      where: { id, statut: InventoryStatus.EN_COURS }
    });

    if (!inventaire) {
      return res.status(404).json({ 
        message: 'Inventaire non trouvé ou déjà finalisé' 
      });
    }

    // Finaliser l'inventaire
    inventaire.statut = InventoryStatus.FINALISE;
    inventaire.finalized_by_user_id = userId;
    inventaire.finalized_at = new Date();

    const savedInventaire = await inventaireRepository.save(inventaire);

    // Retourner l'inventaire avec les relations
    const fullInventaire = await inventaireRepository.findOne({
      where: { id: savedInventaire.id },
      relations: ['created_by', 'finalized_by']
    });

    res.json(fullInventaire);
  } catch (error) {
    console.error('Erreur lors de la finalisation de l\'inventaire:', error);
    res.status(500).json({ message: 'Erreur lors de la finalisation de l\'inventaire' });
  }
});

// DELETE /inventaires/:id/entries/:entryId - Supprimer une entrée d'inventaire
router.delete('/:id/entries/:entryId', authMiddleware, async (req, res) => {
  try {
    const { id: inventaireId, entryId } = req.params;
    const userId = (req as any).user.userId;

    // Vérifier que l'inventaire est en cours
    const inventaireRepository = AppDataSource.getRepository(Inventaire);
    const inventaire = await inventaireRepository.findOne({
      where: { id: inventaireId, statut: InventoryStatus.EN_COURS }
    });

    if (!inventaire) {
      return res.status(404).json({ 
        message: 'Inventaire non trouvé ou non modifiable' 
      });
    }

    const entryRepository = AppDataSource.getRepository(InventaireEntry);
    const entry = await entryRepository.findOne({
      where: { 
        id: entryId, 
        inventaire_id: inventaireId,
        utilisateur_id: userId  // Seul l'utilisateur qui a créé l'entrée peut la supprimer
      }
    });

    if (!entry) {
      return res.status(404).json({ 
        message: 'Entrée non trouvée ou non autorisée' 
      });
    }

    await entryRepository.remove(entry);
    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'entrée:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'entrée' });
  }
});

export const inventairesRouter = router;