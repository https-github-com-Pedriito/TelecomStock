import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Inventaire, InventoryStatus } from '../entities/Inventaire';
import { InventaireEntry } from '../entities/InventaireEntry';
import { Article } from '../entities/Article';
import { User } from '../entities/User';
import { authMiddleware } from '../middleware/auth';
import * as ExcelJS from 'exceljs';

const router = Router();

/**
 * @swagger
 * /inventaires:
 *   get:
 *     summary: Récupérer tous les inventaires
 *     tags: [Inventaires]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des inventaires
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Inventaire'
 */
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

/**
 * @swagger
 * /inventaires/current:
 *   get:
 *     summary: Récupérer l'inventaire en cours
 *     tags: [Inventaires]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventaire en cours
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Inventaire'
 */
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

/**
 * @swagger
 * /inventaires:
 *   post:
 *     summary: Créer un nouvel inventaire
 *     tags: [Inventaires]
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
 *                 example: Inventaire Novembre 2025
 *               description:
 *                 type: string
 *                 example: Inventaire mensuel
 *               mois:
 *                 type: integer
 *                 example: 11
 *               annee:
 *                 type: integer
 *                 example: 2025
 *     responses:
 *       201:
 *         description: Inventaire créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Inventaire'
 *       400:
 *         description: Un inventaire est déjà en cours
 */
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

/**
 * @swagger
 * /inventaires/{id}:
 *   get:
 *     summary: Récupérer un inventaire spécifique
 *     tags: [Inventaires]
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
 *         description: Inventaire trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Inventaire'
 *       404:
 *         description: Inventaire non trouvé
 */
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

/**
 * @swagger
 * /inventaires/{id}/export:
 *   get:
 *     summary: Exporter un inventaire en Excel
 *     tags: [Inventaires]
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
 *         description: Fichier Excel généré
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Inventaire non trouvé
 */
router.get('/:id/export', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer l'inventaire
    const inventaireRepository = AppDataSource.getRepository(Inventaire);
    const inventaire = await inventaireRepository.findOne({
      where: { id },
      relations: ['created_by', 'finalized_by']
    });

    if (!inventaire) {
      return res.status(404).json({ message: 'Inventaire non trouvé' });
    }

    // Récupérer les entrées avec articles
    const entryRepository = AppDataSource.getRepository(InventaireEntry);
    const entries = await entryRepository.find({
      where: { inventaire_id: id },
      relations: ['article', 'utilisateur'],
      order: { created_at: 'ASC' }
    });

    // Créer le workbook Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TelecomStock';
    workbook.created = new Date();

    // Feuille 1: Informations générales
    const infoSheet = workbook.addWorksheet('Informations');
    
    infoSheet.addRow(['INVENTAIRE - ' + inventaire.nom.toUpperCase()]);
    infoSheet.addRow([]);
    infoSheet.addRow(['Nom:', inventaire.nom]);
    infoSheet.addRow(['Description:', inventaire.description]);
    infoSheet.addRow(['Statut:', inventaire.statut]);
    infoSheet.addRow(['Mois:', inventaire.mois]);
    infoSheet.addRow(['Année:', inventaire.annee]);
    infoSheet.addRow(['Créé par:', inventaire.created_by?.nom || 'N/A']);
    infoSheet.addRow(['Date création:', inventaire.created_at?.toLocaleString('fr-FR')]);
    
    if (inventaire.finalized_by) {
      infoSheet.addRow(['Finalisé par:', inventaire.finalized_by.nom]);
      infoSheet.addRow(['Date finalisation:', inventaire.finalized_at?.toLocaleString('fr-FR')]);
    }

    // Style du titre
    infoSheet.getCell('A1').font = { bold: true, size: 16 };
    infoSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };

    // Ajuster les largeurs
    infoSheet.getColumn(1).width = 20;
    infoSheet.getColumn(2).width = 40;

    // Feuille 2: Détails des entrées
    const detailSheet = workbook.addWorksheet('Détails Inventaire');
    
    // En-têtes
    const headerRow = detailSheet.addRow([
      'Article',
      'Code Barres',
      'Quantité Comptée',
      'Quantité Théorique',
      'Écart',
      'Écart %',
      'Statut',
      'Compté par',
      'Date',
      'Commentaire'
    ]);

    // Style des en-têtes
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2196F3' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Ajouter les données
    let totalComptee = 0;
    let totalTheorique = 0;

    entries.forEach(entry => {
      const ecart = entry.quantite_comptee - entry.quantite_theorique;
      const ecartPct = entry.quantite_theorique > 0 
        ? ((ecart / entry.quantite_theorique) * 100).toFixed(2) + '%'
        : 'N/A';
      
      const statut = ecart === 0 ? '✓ OK' : (ecart > 0 ? '↑ Excédent' : '↓ Manquant');

      const row = detailSheet.addRow([
        entry.article?.nom || 'Article supprimé',
        entry.article?.code_barres || 'N/A',
        entry.quantite_comptee,
        entry.quantite_theorique,
        ecart,
        ecartPct,
        statut,
        entry.utilisateur?.nom || 'N/A',
        entry.created_at?.toLocaleString('fr-FR'),
        entry.commentaire || ''
      ]);

      // Colorer selon l'écart
      if (ecart < 0) {
        row.getCell(5).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEBEE' }
        };
        row.getCell(5).font = { color: { argb: 'FFD32F2F' } };
      } else if (ecart > 0) {
        row.getCell(5).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F5E9' }
        };
        row.getCell(5).font = { color: { argb: 'FF388E3C' } };
      }

      totalComptee += entry.quantite_comptee;
      totalTheorique += entry.quantite_theorique;
    });

    // Ligne de total
    detailSheet.addRow([]);
    const totalRow = detailSheet.addRow([
      'TOTAL',
      '',
      totalComptee,
      totalTheorique,
      totalComptee - totalTheorique,
      '',
      '',
      '',
      '',
      ''
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Ajuster les largeurs des colonnes
    detailSheet.getColumn(1).width = 30; // Article
    detailSheet.getColumn(2).width = 15; // Code Barres
    detailSheet.getColumn(3).width = 15; // Quantité Comptée
    detailSheet.getColumn(4).width = 18; // Quantité Théorique
    detailSheet.getColumn(5).width = 10; // Écart
    detailSheet.getColumn(6).width = 10; // Écart %
    detailSheet.getColumn(7).width = 15; // Statut
    detailSheet.getColumn(8).width = 20; // Compté par
    detailSheet.getColumn(9).width = 20; // Date
    detailSheet.getColumn(10).width = 30; // Commentaire

    // Figer la première ligne
    detailSheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    // Générer le fichier
    const fileName = `Inventaire_${inventaire.nom.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Erreur lors de l\'export Excel:', error);
    res.status(500).json({ message: 'Erreur lors de l\'export Excel' });
  }
});

export const inventairesRouter = router;