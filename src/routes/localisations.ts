import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Localisation } from '../entities/Localisation';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const localisationRepository = AppDataSource.getRepository(Localisation);

/**
 * @swagger
 * /localisations:
 *   get:
 *     summary: Récupérer toutes les localisations actives
 *     tags: [Localisations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des localisations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Localisation'
 */
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

/**
 * @swagger
 * /localisations/{id}:
 *   get:
 *     summary: Récupérer une localisation par ID
 *     tags: [Localisations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Localisation trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Localisation'
 *       404:
 *         description: Localisation non trouvée
 */
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

/**
 * @swagger
 * /localisations:
 *   post:
 *     summary: Créer une nouvelle localisation
 *     tags: [Localisations]
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
 *             properties:
 *               nom:
 *                 type: string
 *                 example: Entrepôt A
 *               description:
 *                 type: string
 *                 example: Entrepôt principal
 *               type:
 *                 type: string
 *                 example: entrepot
 *     responses:
 *       201:
 *         description: Localisation créée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Localisation'
 *       400:
 *         description: Données invalides
 */
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

/**
 * @swagger
 * /localisations/{id}:
 *   put:
 *     summary: Mettre à jour une localisation
 *     tags: [Localisations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               est_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Localisation mise à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Localisation'
 *       404:
 *         description: Localisation non trouvée
 */
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

/**
 * @swagger
 * /localisations/{id}:
 *   delete:
 *     summary: Supprimer (désactiver) une localisation
 *     tags: [Localisations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Localisation désactivée
 *       404:
 *         description: Localisation non trouvée
 */
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