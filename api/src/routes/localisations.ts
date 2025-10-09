import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Localisation } from '../entities/Localisation';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const localisationRepository = AppDataSource.getRepository(Localisation);

// GET /api/localisations - Récupérer toutes les localisations actives
router.get('/', authMiddleware, async (req, res) => {
  try {
    const localisations = await localisationRepository.find({
      where: { est_active: true },
      order: { nom: 'ASC' }
    });
    res.json(localisations);
  } catch (error) {
    console.error('Erreur lors de la récupération des localisations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/localisations/:id - Récupérer une localisation par ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const localisation = await localisationRepository.findOne({
      where: { id: req.params.id }
    });
    
    if (!localisation) {
      return res.status(404).json({ error: 'Localisation non trouvée' });
    }
    
    res.json(localisation);
  } catch (error) {
    console.error('Erreur lors de la récupération de la localisation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/localisations - Créer une nouvelle localisation
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { nom, description, type } = req.body;
    
    if (!nom) {
      return res.status(400).json({ error: 'Le nom de la localisation est requis' });
    }
    
    // Vérifier si la localisation existe déjà
    const existingLocalisation = await localisationRepository.findOne({
      where: { nom }
    });
    
    if (existingLocalisation) {
      return res.status(400).json({ error: 'Une localisation avec ce nom existe déjà' });
    }
    
    const localisation = localisationRepository.create({
      nom,
      description,
      type,
      est_active: true
    });
    
    await localisationRepository.save(localisation);
    res.status(201).json(localisation);
  } catch (error) {
    console.error('Erreur lors de la création de la localisation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/localisations/:id - Mettre à jour une localisation
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { nom, description, type, est_active } = req.body;
    
    const localisation = await localisationRepository.findOne({
      where: { id: req.params.id }
    });
    
    if (!localisation) {
      return res.status(404).json({ error: 'Localisation non trouvée' });
    }
    
    // Vérifier si le nouveau nom existe déjà (sauf pour la localisation actuelle)
    if (nom && nom !== localisation.nom) {
      const existingLocalisation = await localisationRepository.findOne({
        where: { nom }
      });
      
      if (existingLocalisation) {
        return res.status(400).json({ error: 'Une localisation avec ce nom existe déjà' });
      }
    }
    
    if (nom) localisation.nom = nom;
    if (description !== undefined) localisation.description = description;
    if (type) localisation.type = type;
    if (est_active !== undefined) localisation.est_active = est_active;
    
    await localisationRepository.save(localisation);
    res.json(localisation);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la localisation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/localisations/:id - Supprimer (désactiver) une localisation
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const localisation = await localisationRepository.findOne({
      where: { id: req.params.id }
    });
    
    if (!localisation) {
      return res.status(404).json({ error: 'Localisation non trouvée' });
    }
    
    // Désactiver au lieu de supprimer pour préserver l'intégrité des données
    localisation.est_active = false;
    await localisationRepository.save(localisation);
    
    res.json({ message: 'Localisation désactivée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la localisation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export { router as localisationsRouter };