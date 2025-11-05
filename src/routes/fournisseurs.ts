import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Fournisseur } from '../entities/Fournisseur';

const router = Router();
const fournisseurRepository = AppDataSource.getRepository(Fournisseur);

// GET /fournisseurs
router.get('/', async (req, res) => {
  try {
    const fournisseurs = await fournisseurRepository.find();
    res.json(fournisseurs);
  } catch (error) {
    console.error('Erreur lors de la récupération des fournisseurs:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des fournisseurs' });
  }
});

// GET /fournisseurs/:id
router.get('/:id', async (req, res) => {
  try {
    const fournisseur = await fournisseurRepository.findOne({
      where: { id: req.params.id }
    });
    
    if (!fournisseur) {
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }
    
    res.json(fournisseur);
  } catch (error) {
    console.error('Erreur lors de la récupération du fournisseur:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du fournisseur' });
  }
});

// POST /fournisseurs
router.post('/', async (req, res) => {
  try {
    console.log('Création d\'un nouveau fournisseur - Données reçues:', req.body);
    const { nom, contact, email, telephone, adresse } = req.body;
    
    console.log('Création de l\'entité fournisseur...');
    const fournisseur = fournisseurRepository.create({
      nom,
      contact,
      email,
      telephone,
      adresse
    });
    
    console.log('Sauvegarde du fournisseur dans la base de données...');
    const savedFournisseur = await fournisseurRepository.save(fournisseur);
    console.log('Fournisseur créé avec succès:', savedFournisseur);
    
    res.status(201).json(savedFournisseur);
  } catch (error) {
    console.error('Erreur lors de la création du fournisseur:', error);
    console.error('Détails de l\'erreur:', {
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : 'Stack non disponible',
      body: req.body
    });
    res.status(500).json({ 
      message: 'Erreur lors de la création du fournisseur',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// PUT /fournisseurs/:id
router.put('/:id', async (req, res) => {
  try {
    console.log('Mise à jour du fournisseur', req.params.id);
    console.log('Données de mise à jour:', req.body);
    
    const { nom, contact, email, telephone, adresse } = req.body;
    const fournisseur = await fournisseurRepository.findOne({
      where: { id: req.params.id }
    });
    
    if (!fournisseur) {
      console.log('Fournisseur non trouvé:', req.params.id);
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }
    
    console.log('Fournisseur trouvé:', fournisseur);
    fournisseur.nom = nom;
    fournisseur.contact = contact;
    fournisseur.email = email;
    fournisseur.telephone = telephone;
    fournisseur.adresse = adresse;
    
    console.log('Sauvegarde des modifications...');
    const updatedFournisseur = await fournisseurRepository.save(fournisseur);
    console.log('Fournisseur mis à jour avec succès:', updatedFournisseur);
    res.json(updatedFournisseur);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du fournisseur:', error);
    console.error('Détails de l\'erreur:', {
      id: req.params.id,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : 'Stack non disponible',
      body: req.body
    });
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour du fournisseur',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// DELETE /fournisseurs/:id
router.delete('/:id', async (req, res) => {
  try {
    console.log('Tentative de suppression du fournisseur:', req.params.id);
    
    const result = await fournisseurRepository.delete(req.params.id);
    console.log('Résultat de la suppression:', result);
    
    if (result.affected === 0) {
      console.log('Fournisseur non trouvé pour la suppression:', req.params.id);
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }
    
    console.log('Fournisseur supprimé avec succès');
    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression du fournisseur:', error);
    console.error('Détails de l\'erreur:', {
      id: req.params.id,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : 'Stack non disponible'
    });
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du fournisseur',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export const fournisseursRouter = router;
