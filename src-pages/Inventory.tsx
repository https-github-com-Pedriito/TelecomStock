'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { InventaireDetailModal } from '@/components/InventaireDetailModal';
import { useInventaire } from '@/hooks/useInventaire';
import { api } from '@/lib/api';
import { FileText, Plus, Eye, List, Package, Trash2, CheckCircle, Rocket, Upload, Download, Info, Sparkles, History, Activity, ChevronRight, ChevronLeft, ArrowRight, ClipboardCheck, Search, X } from 'lucide-react';
import { Portal } from '@/components/Portal';

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner').then(m => m.BarcodeScanner), { ssr: false });

interface InventoryProps {
  articles: any[];
  currentUser: any;
  users: any[];
  getArticleByCodeBarres: (code: string) => any;
  addNotification?: (notif: { type: string; title: string; message: string; duration?: number }) => void;
}

export function Inventory({ articles, currentUser, users, getArticleByCodeBarres }: InventoryProps) {
  const {
    inventaires,
    currentInventaire,
    currentEntries,
    loading,
    error,
    createInventaire,
    addEntry,
    deleteEntry,
    finalizeInventaire,
    loadInventaires,
    loadCurrentInventaire,
    clearError
  } = useInventaire();
  const { addNotification } = arguments[0];

  const [showScanner, setShowScanner] = useState(false);

  // États pour la création d'inventaire
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newInventaireName, setNewInventaireName] = useState('');
  const [newInventaireDescription, setNewInventaireDescription] = useState('');

  // État pour la modale de détails
  const [selectedInventaire, setSelectedInventaire] = useState<any>(null);

  // États pour la pagination des inventaires
  const [currentPageInventaires, setCurrentPageInventaires] = useState(1);

  // États pour le formulaire de comptage
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [quantiteComptee, setQuantiteComptee] = useState<number>(0);
  const [commentaire, setCommentaire] = useState('');

  // États pour l'inventaire express
  const [showExpressForm, setShowExpressForm] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  /* Removed unused Article loading state */
  const [isDragging, setIsDragging] = useState(false);
  const [csvProcessing, setCsvProcessing] = useState(false);
  const [expressProgress, setExpressProgress] = useState<{
    currentStep: string;
    currentArticle?: string;
    processed: number;
    total: number;
    errors: string[];
    success: boolean;
  }>({ currentStep: '', processed: 0, total: 0, errors: [], success: false });
  const [csvValidation, setCsvValidation] = useState<{
    validated: boolean;
    totalArticles: number;
    foundArticles: number;
    notFoundArticles: { ligne: number; nom: string; reference: string }[];
  } | null>(null);
  const [csvValidationError, setCsvValidationError] = useState<string | null>(null);

  // Articles les plus recherchés dans les inventaires
  const mostSearchedArticles = articles
    .filter(a => a.quantite_stock !== undefined)
    .sort((a, b) => (b.quantite_stock || 0) - (a.quantite_stock || 0))
    .slice(0, 3);

  // Auto-générer le nom d'inventaire par défaut
  useEffect(() => {
    const now = new Date();
    const month = now.toLocaleString('fr-FR', { month: 'long' });
    const year = now.getFullYear();
    setNewInventaireName(`Inventaire ${month} ${year}`);
    setNewInventaireDescription(`Inventaire mensuel de ${month} ${year}`);
  }, []);


  const handleCreateInventaire = async () => {
    if (!newInventaireName.trim()) return;

    try {
      const now = new Date();
      await createInventaire({
        nom: newInventaireName,
        description: newInventaireDescription,
        mois: now.getMonth() + 1,
        annee: now.getFullYear()
      });
      setShowCreateForm(false);
      setNewInventaireName('');
      setNewInventaireDescription('');
      addNotification && addNotification({
        type: 'success',
        title: 'Inventaire créé',
        message: 'Inventaire créé avec succès.',
        duration: 4000
      });
    } catch (err) {
      console.error('Erreur création inventaire:', err);
      addNotification && addNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Erreur lors de la création de l\'inventaire.',
        duration: 5000
      });
    }
  };

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    const found = getArticleByCodeBarres(barcode);
    if (!found) {
      alert("Equipement non trouvé dans la base — impossible d'enregistrer");
      return;
    }
    setSelectedArticle(found);
    setQuantiteComptee(found.quantite_stock || 0);
  };

  const filteredArticles = searchQuery.trim() === '' ? [] : articles.filter(a =>
    a.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.code_barres?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.categorie?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  const handleSubmitCount = async () => {
    if (!selectedArticle || !currentInventaire) return;

    try {
      await addEntry({
        article_id: selectedArticle.id,
        quantite_comptee: quantiteComptee,
        commentaire: commentaire || undefined
      });

      // Réinitialiser le formulaire
      setSelectedArticle(null);
      setSearchQuery('');
      setQuantiteComptee(0);
      setCommentaire('');

      addNotification && addNotification({
        type: 'success',
        title: 'Comptage enregistré',
        message: `${selectedArticle.nom} a été compté`,
        duration: 2000
      });
    } catch (err) {
      console.error('Erreur:', err);
      addNotification && addNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible d\'enregistrer le comptage',
        duration: 3000
      });
    }
  };

  // Télécharger le template CSV
  const downloadCsvTemplate = () => {
    const headers = ['nom', 'reference', 'quantite', 'localisation', 'categorie', 'fournisseur', 'seuil_min', 'prix'];

    // Utiliser les 3 articles les plus utilisés comme exemples
    const exampleData = mostSearchedArticles.length > 0
      ? mostSearchedArticles.map(article => [
        article.nom || '',
        article.code_barres || '',
        article.quantite_stock?.toString() || '0',
        article.localisation || 'À renseigner',
        article.categorie || '',
        article.fournisseur || '',
        article.seuil_min?.toString() || '',
        article.prix_unitaire?.toString() || ''
      ])
      : [
        ['Câble HDMI 2m', 'CAB-HDMI-002', '15', 'Entrepôt A - Rayon 3', 'Câbles', 'TechSupply', '5', '12.50'],
        ['Adaptateur USB-C', 'ADP-USBC-001', '42', 'Entrepôt B - Rayon 1', 'Adaptateurs', 'ElectroPro', '10', '8.90'],
        ['Souris sans fil', 'SOU-WIFI-005', '28', 'Entrepôt A - Rayon 5', 'Périphériques', 'TechSupply', '8', '24.99']
      ];

    const csvContent = [
      headers.join(','),
      ...exampleData.map(row => row.join(','))
    ].join('\n');

    // Ajouter le BOM UTF-8 pour l'encodage correct des caractères accentués
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_inventaire_express.csv';
    link.click();
  };

  // Gérer le drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      setCsvFile(file);
      setCsvValidation(null); // Réinitialiser la validation si on change de fichier
      setCsvValidationError(null);
    } else {
      addNotification && addNotification({
        type: 'error',
        title: 'Fichier invalide',
        message: 'Veuillez déposer un fichier CSV',
        duration: 3000
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setCsvValidation(null); // Réinitialiser la validation si on change de fichier
      setCsvValidationError(null);
    }
  };

  // Valider le fichier CSV
  const validateCsvFile = async () => {
    if (!csvFile) return;

    setCsvProcessing(true);
    setCsvValidation(null);
    setCsvValidationError(null);

    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('Le fichier CSV est vide ou invalide');
      }

      // Vérifier le header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredFields = ['nom', 'reference', 'quantite', 'localisation'];
      const missingFields = requiredFields.filter(field => !headers.includes(field));

      if (missingFields.length > 0) {
        throw new Error(`Le fichier CSV doit contenir les colonnes obligatoires : ${missingFields.join(', ')}`);
      }

      let foundCount = 0;
      const notFound: { ligne: number; nom: string; reference: string }[] = [];

      // Vérifier chaque article
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        // Chercher l'article
        const article = articles.find(a =>
          a.nom.toLowerCase() === row.nom?.toLowerCase() ||
          a.code_barres?.toLowerCase() === row.reference?.toLowerCase()
        );

        if (article) {
          foundCount++;
        } else {
          notFound.push({
            ligne: i + 1,
            nom: row.nom || '',
            reference: row.reference || ''
          });
        }
      }

      setCsvValidation({
        validated: true,
        totalArticles: lines.length - 1,
        foundArticles: foundCount,
        notFoundArticles: notFound
      });

      if (notFound.length === 0) {
        addNotification && addNotification({
          type: 'success',
          title: 'Validation réussie',
          message: `Tous les ${foundCount} équipements ont été trouvés dans la base de données !`,
          duration: 5000
        });
      } else {
        addNotification && addNotification({
          type: 'warning',
          title: 'Équipements non trouvés',
          message: `${notFound.length} équipement(s) sur ${lines.length - 1} n'ont pas été trouvés`,
          duration: 5000
        });
      }

    } catch (err: any) {
      console.error('Erreur validation CSV:', err);
      setCsvValidationError(err.message || 'Impossible de valider le fichier CSV');
      addNotification && addNotification({
        type: 'error',
        title: 'Erreur',
        message: err.message || 'Impossible de valider le fichier CSV',
        duration: 5000
      });
    } finally {
      setCsvProcessing(false);
    }
  };

  // Traiter le fichier CSV
  const processExpressInventory = async () => {
    console.log('🚀 [DÉMARRAGE] processExpressInventory');
    if (!csvFile || !csvValidation) {
      console.log('❌ [VALIDATION] csvFile ou csvValidation manquant', { csvFile: !!csvFile, csvValidation: !!csvValidation });
      return;
    }

    // Vérifier que tous les articles ont été trouvés
    if (csvValidation.notFoundArticles.length > 0) {
      console.log('❌ [VALIDATION] Equipements non trouvés:', csvValidation.notFoundArticles);
      addNotification && addNotification({
        type: 'error',
        title: 'Validation requise',
        message: 'Tous les équipements doivent être trouvés dans la base de données avant de créer l\'inventaire',
        duration: 5000
      });
      return;
    }

    console.log('✅ [VALIDATION] CSV validé avec succès');
    setCsvProcessing(true);
    setExpressProgress({ currentStep: '📖 Étape 1/5 - Lecture du fichier...', processed: 0, total: 0, errors: [], success: false });

    let createdInventaireId: string | null = null;

    try {
      console.log('📖 [FICHIER] Lecture du fichier CSV');
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      console.log(`📊 [FICHIER] ${lines.length} lignes trouvées (header + ${lines.length - 1} équipements)`);
      setExpressProgress(prev => ({ ...prev, currentStep: '✓ Étape 1 terminée\n📋 Étape 2/5 - Validation du format...', total: lines.length - 1 }));
      await new Promise(resolve => setTimeout(resolve, 300));

      // Vérifier le header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      console.log('📋 [HEADERS] Colonnes détectées:', headers);

      setExpressProgress(prev => ({ ...prev, currentStep: '✓ Étape 2 terminée\n🔄 Étape 3/5 - Création de l\'inventaire...' }));
      await new Promise(resolve => setTimeout(resolve, 300));

      // Créer un nouvel inventaire APRÈS validation
      const now = new Date();
      const inventaireName = `Inventaire Express ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

      console.log('🔄 [CRÉATION] Création de l\'inventaire:', inventaireName);
      const newInventaire = await createInventaire({
        nom: inventaireName,
        description: `Import CSV - ${csvFile.name} [EXPRESS]`,
        mois: now.getMonth() + 1,
        annee: now.getFullYear()
      });

      if (!newInventaire) {
        console.log('❌ [CRÉATION] createInventaire a retourné undefined');
        throw new Error('Impossible de créer l\'inventaire');
      }

      createdInventaireId = newInventaire.id;
      console.log('✅ [CRÉATION] Inventaire créé avec l\'ID:', createdInventaireId);

      // Attendre un peu que l'UI se mette à jour
      await new Promise(resolve => setTimeout(resolve, 500));

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      console.log('📦 [IMPORT] Démarrage de l\'import des articles');
      setExpressProgress(prev => ({ ...prev, currentStep: '✓ Étape 3 terminée\n📦 Étape 4/5 - Import des articles...' }));
      await new Promise(resolve => setTimeout(resolve, 300));

      // Traiter chaque ligne
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        console.log(`📍 [LIGNE ${i}] Traitement de l\'équipement:`, row.nom, '(Référence:', row.reference, ')');

        // Mise à jour de la progression
        setExpressProgress(prev => ({
          ...prev,
          currentArticle: row.nom || 'Equipement inconnu',
          processed: i,
          currentStep: `📦 Étape 4/5 - Import en cours...\n${i}/${lines.length - 1} équipements (${Math.round((i / (lines.length - 1)) * 100)}%)`
        }));

        // Trouver l'article par nom ou référence
        let article = articles.find(a =>
          a.nom.toLowerCase() === row.nom?.toLowerCase() ||
          a.code_barres?.toLowerCase() === row.reference?.toLowerCase()
        );

        if (article) {
          console.log(`✅ [LIGNE ${i}] Article trouvé - ID: ${article.id}`);
          try {
            // Construire le commentaire avec tous les champs optionnels
            const commentParts = [];
            if (row.localisation) commentParts.push(`Loc: ${row.localisation}`);
            if (row.categorie) commentParts.push(`Cat: ${row.categorie}`);
            if (row.fournisseur) commentParts.push(`Fourn: ${row.fournisseur}`);
            if (row.seuil_min) commentParts.push(`Seuil: ${row.seuil_min}`);
            if (row.prix) commentParts.push(`Prix: ${row.prix}€`);

            console.log(`📤 [LIGNE ${i}] Appel ApiService.addInventaireEntry()`);

            const requestBody = {
              article_id: article.id,
              quantite_comptee: parseInt(row.quantite) || 0,
              commentaire: commentParts.length > 0 ? commentParts.join(' | ') : undefined
            };
            console.log(`📋 [LIGNE ${i}] Body de la requête:`, requestBody);

            const result = await api.addInventaireEntry(createdInventaireId!, requestBody);

            console.log(`✅ [LIGNE ${i}] Équipement ajouté avec succès:`, result);

            successCount++;
          } catch (err) {
            errorCount++;
            const errorMsg = `Ligne ${i + 1}: Erreur lors de l'ajout de ${row.nom}`;
            errors.push(errorMsg);
            console.error(`❌ [LIGNE ${i}]`, errorMsg, err);
            setExpressProgress(prev => ({ ...prev, errors: [...prev.errors, errorMsg] }));
          }
        } else {
          errorCount++;
          const errorMsg = `Ligne ${i + 1}: Équipement non trouvé - ${row.nom}`;
          errors.push(errorMsg);
          console.warn(`❌ [LIGNE ${i}]`, errorMsg);
          setExpressProgress(prev => ({ ...prev, errors: [...prev.errors, errorMsg] }));
        }

        // Petite pause pour laisser l'UI se mettre à jour
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      console.log(`📊 [RÉSUMÉ IMPORT] Succès: ${successCount}, Erreurs: ${errorCount}`);

      if (successCount === 0) {
        console.log('❌ [IMPORT] Aucun équipement n\'a pu être importé');
        throw new Error('Aucun équipement n\'a pu être importé');
      }

      console.log('🏁 [FINALISATION] Passage en mode finalisation');
      setExpressProgress(prev => ({ ...prev, currentStep: '✓ Étape 4 terminée\n✔️ Étape 5/5 - Finalisation de l\'inventaire...' }));
      await new Promise(resolve => setTimeout(resolve, 500));

      // Finaliser automatiquement l'inventaire express en utilisant l'ApiService
      try {
        console.log(`📤 [FINALISATION] Appel ApiService.finalizeInventaire()`);

        const result = await api.finalizeInventaire(createdInventaireId!);

        console.log('✅ [FINALISATION] Inventaire finalisé avec succès:', result);
        console.log('✅ Inventaire express créé et finalisé avec succès');
      } catch (finalizeError: any) {
        console.error('❌ [FINALISATION] Erreur lors de la finalisation:', finalizeError);
        throw new Error(`Impossible de finaliser l'inventaire: ${finalizeError.message}`);
      }

      console.log('🎉 [SUCCÈS] Recharge des inventaires');
      setExpressProgress(prev => ({
        ...prev,
        currentStep: '✓ Étape 5 terminée\n✅ Inventaire express finalisé avec succès !',
        success: true
      }));

      // Recharger les inventaires pour mettre à jour la liste
      await loadInventaires();
      console.log('✅ [SUCCÈS] loadInventaires() terminé');

      await loadCurrentInventaire();
      console.log('✅ [SUCCÈS] loadCurrentInventaire() terminé');

      // Attendre un peu pour s'assurer que l'UI est à jour
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🎊 [SUCCÈS FINAL] Notification utilisateur');
      addNotification && addNotification({
        type: 'success',
        title: 'Inventaire express finalisé',
        message: `${successCount} articles importés et inventaire finalisé avec succès${errorCount > 0 ? ` (${errorCount} erreurs)` : ''}`,
        duration: 5000
      });

    } catch (err: any) {
      console.error('❌ [ERREUR GÉNÉRALE] Erreur traitement CSV:', err);
      console.log('Stack trace:', err.stack);
      setExpressProgress(prev => ({
        ...prev,
        currentStep: `❌ Erreur: ${err.message}`,
        success: false
      }));

      // Si l'inventaire a été créé mais qu'il y a eu une erreur, le supprimer
      if (createdInventaireId) {
        try {
          console.log(`🗑️ [NETTOYAGE] Suppression de l\'inventaire en erreur: ${createdInventaireId}`);
          // Supprimer l'inventaire en erreur
          const token = localStorage.getItem('auth_token');
          console.log('🔐 [NETTOYAGE] Token auth présent:', !!token);

          const response = await fetch(`/api/inventaires/${createdInventaireId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          });

          console.log(`📨 [NETTOYAGE] Réponse API - Status: ${response.status} ${response.statusText}`);

          if (response.ok) {
            console.log('✅ [NETTOYAGE] Inventaire en erreur supprimé avec succès');
          } else {
            const responseText = await response.text();
            console.log('⚠️ [NETTOYAGE] Échec de la suppression:', responseText);
          }
        } catch (deleteErr) {
          console.error('❌ [NETTOYAGE] Impossible de supprimer l\'inventaire en erreur:', deleteErr);
        }
      }

      addNotification && addNotification({
        type: 'error',
        title: 'Erreur',
        message: err.message || 'Impossible de traiter le fichier CSV',
        duration: 5000
      });
    } finally {
      console.log('🔚 [FIN] Fin de processExpressInventory');
      setCsvProcessing(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) return;

    try {
      await deleteEntry(entryId);
      addNotification && addNotification({
        type: 'success',
        title: 'Entrée supprimée',
        message: 'Entrée supprimée avec succès',
        duration: 2000
      });
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      let errorMessage = 'Erreur lors de la suppression de l\'entrée';
      if (err.response?.status === 404) {
        errorMessage = 'Vous ne pouvez supprimer que vos propres entrées';
      } else if (err.response?.status === 401) {
        errorMessage = 'Vous devez être connecté pour supprimer une entrée';
      } else if (err.message) {
        errorMessage = err.message;
      }
      addNotification && addNotification({
        type: 'error',
        title: 'Erreur',
        message: errorMessage,
        duration: 4000
      });
    }
  };

  const downloadExcel = async (entries: any[]) => {
    const XLSX = await import('xlsx');
    // Préparer les données pour Excel
    const headers = [
      'Article',
      'Référence',
      'Stock Théorique',
      'Quantité Comptée',
      'Différence',
      'Utilisateur',
      'Commentaire',
      'Date de Comptage'
    ];

    const rows = entries.map((entry: any) => {
      const article = articles.find(a => a.id === entry.article_id);
      const user = users.find(u => u.id === entry.utilisateur_id);
      const difference = entry.quantite_comptee - entry.quantite_theorique;

      return [
        article?.nom || 'Inconnu',
        article?.code_barres || 'N/A',
        entry.quantite_theorique,
        entry.quantite_comptee,
        difference,
        user ? `${user.prenom} ${user.nom}` : entry.utilisateur_id,
        entry.commentaire || '',
        new Date(entry.created_at).toLocaleDateString('fr-FR')
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventaire");

    // Ajuster les largeurs de colonnes
    ws['!cols'] = [
      { wch: 30 }, // Article
      { wch: 15 }, // Code Barre
      { wch: 15 }, // Stock Théorique
      { wch: 15 }, // Quantité Comptée
      { wch: 12 }, // Différence
      { wch: 20 }, // Utilisateur
      { wch: 30 }, // Commentaire
      { wch: 15 }  // Date
    ];

    const filename = `inventaire_${currentInventaire?.nom}_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handleFinalize = async () => {
    if (!currentInventaire) return;

    // Compter combien d'articles ont des différences
    const articlesWithDifferences = currentEntries.filter(entry =>
      entry.quantite_comptee !== entry.quantite_theorique
    ).length;

    // Confirmation irréversible
    const confirmMessage = articlesWithDifferences > 0
      ? `⚠️ ATTENTION - OPÉRATION IRRÉVERSIBLE ⚠️\n\n` +
      `Vous êtes sur le point de finaliser l'inventaire "${currentInventaire.nom}".\n\n` +
      `${articlesWithDifferences} article(s) présentent des différences.\n` +
      `Les stocks seront automatiquement réajustés et des mouvements seront créés.\n\n` +
      `Cette action ne peut pas être annulée.\n\n` +
      `Voulez-vous continuer ?`
      : `⚠️ ATTENTION - OPÉRATION IRRÉVERSIBLE ⚠️\n\n` +
      `Vous êtes sur le point de finaliser l'inventaire "${currentInventaire.nom}".\n\n` +
      `Aucune différence détectée.\n\n` +
      `Cette action ne peut pas être annulée.\n\n` +
      `Voulez-vous continuer ?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    let applyAdjustments = articlesWithDifferences > 0;

    try {
      const utilisateurNom = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Utilisateur inconnu';
      await finalizeInventaire(applyAdjustments, utilisateurNom);
      if (currentEntries.length > 0) {
        downloadExcel(currentEntries);
      }
      const successMessage = applyAdjustments && articlesWithDifferences > 0
        ? `Inventaire finalisé avec succès !\n${articlesWithDifferences} article(s) ont été réajustés.`
        : 'Inventaire finalisé avec succès !';
      addNotification && addNotification({
        type: 'success',
        title: 'Inventaire finalisé',
        message: successMessage,
        duration: 4000
      });
    } catch (err) {
      console.error('Erreur lors de la finalisation:', err);
      addNotification && addNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Erreur lors de la finalisation de l\'inventaire',
        duration: 5000
      });
    }
  };

  if (loading && !currentInventaire) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement des inventaires...</div>
      </div>
    );
  }


  return (
    <div className="space-y-8 pb-8">
      {/* Feedback d'erreur moderne */}
      {error && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4 animate-fade-in">
          <span className="font-semibold">{error}</span>
          <button onClick={clearError} className="ml-2 text-white/80 hover:text-white text-xl leading-none">×</button>
        </div>
      )}

      {/* Header Collant Premium */}
      <div className="sticky top-0 z-40 glass border-b border-white/40 dark:border-gray-800/50 shadow-sm transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Session Inventaire
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Mode Supervision en Direct</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!currentInventaire && (
              <>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 text-sm"
                >
                  <Plus size={18} strokeWidth={3} />
                  <span>Nouvelle Session</span>
                </button>
                <button
                  onClick={() => setShowExpressForm(true)}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 glass border border-white/40 dark:border-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white/60 rounded-2xl font-black transition-all active:scale-95 text-sm"
                >
                  <Rocket size={18} strokeWidth={2.5} className="text-amber-500" />
                  <span>Inventaire Express</span>
                </button>
              </>
            )}

            {currentInventaire && (
              <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100/50 dark:border-indigo-800/50 rounded-2xl">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Session Active</span>
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">#{currentInventaire.id.slice(0, 8)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-12">
        {/* Section Accueil Inventaire */}
        {!currentInventaire && (
          <div className="space-y-8 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Carte Guidelines */}
              <div className="glass p-8 rounded-[3rem] border border-white/40 dark:border-gray-800/50 shadow-xl shadow-gray-200/50 dark:shadow-none space-y-6 group hover:translate-y-[-4px] transition-all duration-500">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl w-fit group-hover:scale-110 transition-transform">
                  <Info className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Règles de Collecte</h2>
                <ul className="space-y-4">
                  {[
                    "Un seul entrepôt par session d'inventaire",
                    "Scan obligatoire pour chaque article physique",
                    "Ajustements automatiques après clôture",
                    "Historique complet conservé pour audit"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-600 dark:text-gray-400 font-medium">
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Carte Statistiques Rapides */}
              <div className="glass p-8 rounded-[3rem] border border-white/40 dark:border-gray-800/50 shadow-xl shadow-gray-200/50 dark:shadow-none space-y-6 group hover:translate-y-[-4px] transition-all duration-500 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <Activity size={180} />
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-3xl w-fit group-hover:scale-110 transition-transform">
                  <Sparkles className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Efficacité</h2>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                      <span>Précision Stock</span>
                      <span>98.5%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full w-[98.5%]" />
                    </div>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium text-sm leading-relaxed">
                    Maintenez votre base de données à jour en effectuant des inventaires réguliers par zone de stockage.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Central */}
            <div className="glass p-10 rounded-[4rem] border border-white/40 dark:border-gray-800/50 shadow-xl shadow-gray-200/50 dark:shadow-none text-center space-y-8">
              <div className="mx-auto p-8 bg-gray-50 dark:bg-gray-800/50 rounded-full w-32 h-32 flex items-center justify-center">
                <History size={50} className="text-gray-300" />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black text-gray-900 dark:text-white">Démarrer une session</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto font-medium text-lg">
                  Sélectionnez une méthode d'inventaire pour commencer à répertorier vos actifs physiques.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full sm:w-auto px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Plus size={24} strokeWidth={4} />
                  Nouvelle Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire de comptage */}
        {currentInventaire && !currentInventaire.description?.includes('[EXPRESS]') && (
          <div className="glass p-8 rounded-[3rem] border border-white/40 dark:border-gray-800/50 shadow-xl shadow-gray-200/50 dark:shadow-none space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Saisie des Stocks</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Enregistrement manuel des comptages physiques</p>
              </div>
            </div>

            {/* Barre de Recherche Premium */}
            <div className="space-y-6">
              {!selectedArticle && (
                <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={24} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Scanner ou rechercher un article..."
                    className="w-full pl-16 pr-6 py-5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-indigo-500/50 focus:bg-white dark:focus:bg-gray-800 rounded-[2rem] outline-none transition-all font-bold text-xl text-gray-900 dark:text-white placeholder:text-gray-400 shadow-inner"
                  />

                  {searchQuery && filteredArticles.length > 0 && (
                    <div className="absolute z-10 w-full mt-4 glass border border-white/40 dark:border-gray-800/50 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto">
                      {filteredArticles.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => {
                            setSelectedArticle(article);
                            setSearchQuery('');
                            setQuantiteComptee(article.quantite_stock || 0);
                          }}
                          className="w-full flex items-center justify-between p-6 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                        >
                          <div className="flex items-center gap-4 text-left">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center font-black text-gray-400">
                              {article.nom[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-black text-gray-900 dark:text-white">{article.nom}</div>
                              <div className="text-sm font-bold text-gray-500">{article.code_barres || 'Sans code'}</div>
                            </div>
                          </div>
                          <ChevronRight className="text-gray-300" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Suggestions Premium */}
              {!selectedArticle && mostSearchedArticles.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <Sparkles size={16} className="text-amber-500" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Articles Fréquents</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {mostSearchedArticles.map((article) => (
                      <button
                        key={article.id}
                        onClick={() => {
                          setSelectedArticle(article);
                          setQuantiteComptee(article.quantite_stock || 0);
                        }}
                        className="p-5 glass border border-white/40 dark:border-gray-800/50 rounded-3xl text-left hover:scale-[1.02] active:scale-[0.98] transition-all group"
                      >
                        <div className="font-black text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{article.nom}</div>
                        <div className="text-xs font-bold text-gray-400 mt-1">Stock: {article.quantite_stock}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Zone de saisie si article sélectionné */}
              {selectedArticle && (
                <div className="glass p-8 rounded-[3rem] border-2 border-indigo-500/20 shadow-inner-lg space-y-8 animate-in zoom-in-95 duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                        <Package size={28} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{selectedArticle.nom}</h3>
                        <p className="text-gray-500 font-bold">Théorique: {selectedArticle.quantite_stock}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedArticle(null); setQuantiteComptee(0); setCommentaire(''); }}
                      className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                    >
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Quantité Physique</label>
                      <div className="relative group">
                        <input
                          type="number"
                          value={quantiteComptee}
                          onChange={(e) => setQuantiteComptee(Number(e.target.value))}
                          className="w-full px-8 py-6 bg-white dark:bg-gray-950 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] outline-none text-4xl font-black text-center text-gray-900 dark:text-white transition-all shadow-inner"
                          min="0"
                        />
                        {quantiteComptee !== selectedArticle.quantite_stock && (
                          <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black shadow-lg ${quantiteComptee > selectedArticle.quantite_stock
                            ? 'bg-emerald-500 text-white'
                            : 'bg-rose-500 text-white'
                            }`}>
                            Différence: {quantiteComptee > selectedArticle.quantite_stock ? '+' : ''}{quantiteComptee - selectedArticle.quantite_stock}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Note additionnelle</label>
                      <textarea
                        value={commentaire}
                        onChange={(e) => setCommentaire(e.target.value)}
                        placeholder="Ex: Dommages constatés..."
                        className="w-full h-full px-6 py-5 bg-white dark:bg-gray-950 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] outline-none font-bold text-gray-700 dark:text-gray-300 transition-all shadow-inner resize-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitCount}
                    className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <CheckCircle size={24} />
                    Confirmer le comptage
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Liste des articles comptés */}
        {currentInventaire && (
          <div className="glass p-8 rounded-[3rem] border border-white/40 dark:border-gray-800/50 shadow-xl shadow-gray-200/50 dark:shadow-none space-y-8">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
                  <List className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Articles Répertoriés</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Session en cours : <span className="text-indigo-600 dark:text-indigo-400">#{(currentInventaire as any).id.slice(0, 8)}</span></p>
                </div>
              </div>
              <div className="px-4 py-2 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-2xl">
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{currentEntries.length} Saisies</span>
              </div>
            </div>

            {currentEntries.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="mx-auto w-24 h-24 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center">
                  <Package size={40} className="text-gray-200" />
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-black text-gray-400">Aucun article enregistré</p>
                  <p className="text-gray-500 font-medium">Commencez la collecte pour voir les résultats ici</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentEntries.map(entry => {
                  const article = articles.find(a => a.id === entry.article_id);
                  const user = users.find(u => u.id === entry.utilisateur_id);
                  const difference = entry.quantite_comptee - entry.quantite_theorique;
                  const avatar = user ? `${user.prenom[0] || ''}${user.nom[0] || ''}`.toUpperCase() : '?';
                  return (
                    <div key={entry.id} className="group glass p-6 rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black border border-indigo-100 dark:border-indigo-800 shadow-sm">
                            {avatar}
                          </div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{user ? user.prenom : '—'}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-black text-gray-900 dark:text-white truncate" title={article?.nom}>{article?.nom || 'Inconnu'}</h4>
                            {difference !== 0 && (
                              <div className={`px-2 py-0.5 rounded-full text-[10px] font-black ${difference > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                }`}>
                                {difference > 0 ? '+' : ''}{difference}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="bg-gray-50/50 dark:bg-gray-950/20 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Théorie</p>
                              <p className="text-sm font-black text-gray-700 dark:text-gray-300">{entry.quantite_theorique}</p>
                            </div>
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-2 rounded-xl border border-indigo-100/50 dark:border-indigo-800">
                              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Compté</p>
                              <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{entry.quantite_comptee}</p>
                            </div>
                          </div>

                          {entry.commentaire && (
                            <div className="mt-3 p-3 bg-amber-50/50 dark:bg-amber-900/10 border-l-4 border-amber-400 rounded-r-xl italic text-xs text-amber-700 dark:text-amber-400 font-medium">
                              "{entry.commentaire}"
                            </div>
                          )}
                        </div>

                        {entry.utilisateur_id === currentUser.id && (
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bloc Action Finale */}
            {currentEntries.length > 0 && (
              <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
                <div className="glass p-8 rounded-[3rem] border border-white/40 dark:border-gray-800/50 bg-indigo-600 shadow-2xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
                    <CheckCircle size={150} className="text-white" />
                  </div>
                  <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="text-center md:text-left space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm border border-white/20">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Collecte Terminée</span>
                      </div>
                      <h3 className="text-3xl font-black text-white">Prêt pour la clôture ?</h3>
                      <p className="text-indigo-100 font-medium max-w-md">L'ajustement des stocks est irréversible. Vérifiez bien les écarts avant de valider.</p>
                    </div>
                    <button
                      onClick={handleFinalize}
                      className="w-full md:w-auto px-10 py-5 bg-white text-indigo-600 hover:bg-indigo-50 rounded-[2rem] font-black text-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 whitespace-nowrap"
                    >
                      Finaliser la Session
                      <ArrowRight size={24} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Historique des inventaires */}
        <div className="glass p-8 rounded-[3rem] border border-white/40 dark:border-gray-800/50 shadow-xl shadow-gray-200/50 dark:shadow-none space-y-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
              <History className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Historique des Sessions</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Archives et détails des inventaires passés</p>
            </div>
          </div>

          {inventaires.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-bold">Aucune archive disponible</div>
          ) : (
            <div className="space-y-4">
              {inventaires
                .slice((currentPageInventaires - 1) * 10, currentPageInventaires * 10)
                .map((inv) => (
                  <div key={inv.id} className="group glass p-6 rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className={`w-3 h-12 rounded-full ${inv.statut === 'EN_COURS' ? 'bg-emerald-500 shadow-lg shadow-emerald-200' :
                        inv.statut === 'FINALISE' ? 'bg-indigo-500' : 'bg-gray-300'
                        }`} />

                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="font-black text-lg text-gray-900 dark:text-white">{inv.nom}</h4>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${inv.statut === 'EN_COURS' ? 'bg-emerald-100 text-emerald-600' :
                            inv.statut === 'FINALISE' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {inv.statut}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-500 mt-1">
                          {inv.description || "Aucune description"} • <span className="text-gray-400 font-bold">{new Date(inv.created_at).toLocaleDateString('fr-FR')}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedInventaire(inv)}
                      className="px-6 py-3 glass border border-white/40 dark:border-gray-800/50 hover:bg-indigo-600 hover:text-white rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-2 group-hover:shadow-lg"
                    >
                      <Eye size={18} />
                      Voir le Rapport
                    </button>
                  </div>
                ))}

              {/* Pagination Premium */}
              {inventaires.length > 10 && (
                <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
                  <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                    Page {currentPageInventaires} / {Math.ceil(inventaires.length / 10)}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentPageInventaires(p => Math.max(1, p - 1))}
                      disabled={currentPageInventaires === 1}
                      className="p-4 glass border border-white/40 dark:border-gray-800/50 rounded-2xl disabled:opacity-20 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-90"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => setCurrentPageInventaires(p => p + 1)}
                      disabled={currentPageInventaires >= Math.ceil(inventaires.length / 10)}
                      className="p-4 glass border border-white/40 dark:border-gray-800/50 rounded-2xl disabled:opacity-20 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-90"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Modale Inventaire Express */}
      {showExpressForm && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="glass w-full max-w-4xl max-h-[82dvh] md:max-h-[90vh] rounded-[3rem] border border-white/40 dark:border-gray-800/50 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-200">
                    <Rocket className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Inventaire Express</h2>
                    <p className="text-gray-500 font-medium">Import massif via fichier CSV</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowExpressForm(false);
                    setCsvFile(null);
                    setCsvValidation(null);
                    setExpressProgress({ currentStep: '', processed: 0, total: 0, errors: [], success: false });
                  }}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                >
                  <X className="w-8 h-8 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Guide & Template */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Instructions</h3>
                    <div className="glass p-6 rounded-3xl bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/50">
                      <ul className="space-y-3">
                        {["Template CSV obligatoire", "Colonnes: nom, reference, quantite, localisation", "Articles existants requis", "Clôture automatique possible"].map((step, i) => (
                          <li key={i} className="flex items-center gap-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Outils</h3>
                    <button
                      onClick={downloadCsvTemplate}
                      className="w-full p-6 glass border border-white/40 dark:border-gray-800/50 rounded-3xl flex items-center justify-between group hover:bg-emerald-500 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl group-hover:bg-white/20 transition-colors">
                          <Download className="w-6 h-6 text-emerald-600 dark:text-emerald-400 group-hover:text-white" />
                        </div>
                        <span className="font-black text-gray-900 dark:text-white group-hover:text-white">Template CSV</span>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-white" />
                    </button>
                  </div>
                </div>

                {/* Zone d'importation */}
                {!csvProcessing && !expressProgress.success && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative h-64 border-4 border-dashed rounded-[3rem] transition-all duration-500 flex flex-col items-center justify-center gap-4 group ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-95' :
                      csvFile ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10' :
                        'border-gray-200 dark:border-gray-800 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />

                    {!csvFile ? (
                      <>
                        <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:scale-110 transition-transform">
                          <Upload className="w-10 h-10 text-gray-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-black text-gray-900 dark:text-white">Glisser un fichier CSV</p>
                          <p className="text-gray-500 font-medium mt-1">ou cliquez pour parcourir</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-6 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200">
                          <FileText className="w-10 h-10 text-white" />
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-black text-gray-900 dark:text-white">{csvFile?.name}</p>
                          <p className="text-emerald-600 font-black">{(csvFile!.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setCsvFile(null); setCsvValidation(null); }}
                          className="mt-2 text-rose-500 font-black hover:underline"
                        >
                          Supprimer le fichier
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Feedback Section */}
                {(csvValidation || csvProcessing || expressProgress.currentStep) && (
                  <div className="space-y-6">
                    {csvValidation && !csvProcessing && !expressProgress.success && (
                      <div className={`p-6 rounded-3xl border ${csvValidation.notFoundArticles.length === 0
                        ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800'
                        : 'bg-rose-50/50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800'
                        }`}>
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-xl ${csvValidation.notFoundArticles.length === 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                            {csvValidation.notFoundArticles.length === 0 ? <CheckCircle className="text-white" /> : <X className="text-white" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-gray-900 dark:text-white">
                              {csvValidation.notFoundArticles.length === 0 ? "Validation Réussie" : "Erreur de Validation"}
                            </h4>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                              {csvValidation.totalArticles} articles détectés. {csvValidation.notFoundArticles.length} erreur(s).
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {csvValidationError && (
                      <div className="p-6 rounded-3xl bg-rose-50/50 border border-rose-200 dark:bg-rose-900/10 dark:border-rose-800 animate-in slide-in-from-top-4">
                        <div className="flex items-start gap-4 text-rose-600 dark:text-rose-400">
                          <X className="shrink-0" />
                          <p className="font-bold">{csvValidationError}</p>
                        </div>
                      </div>
                    )}

                    {/* Progress & Logs */}
                    {(csvProcessing || expressProgress.currentStep) && (
                      <div className="space-y-4">
                        <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                            style={{ width: `${expressProgress.total > 0 ? (expressProgress.processed / expressProgress.total) * 100 : 0}%` }}
                          />
                        </div>
                        <div className="glass p-6 rounded-3xl border border-white/40 dark:border-gray-800/50 bg-gray-900 shadow-inner">
                          <div className="flex items-center gap-3 mb-4">
                            {!expressProgress.success && !expressProgress.currentStep.includes('❌') && (
                              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                            )}
                            <p className="font-mono text-xs text-indigo-400 font-bold uppercase tracking-widest">{expressProgress.currentStep || "Traitement en cours..."}</p>
                          </div>
                          <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-[10px]">
                            {expressProgress.errors.map((error, i) => (
                              <p key={i} className="text-rose-400">[{i}] ERROR: {error}</p>
                            ))}
                            {expressProgress.success && <p className="text-emerald-400 font-black">SUCCESS: Inventaire finalisé avec succès !</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 pb-12 md:pb-6 border-t border-gray-100/50 dark:border-gray-800/50 bg-white/40 dark:bg-gray-950/40 backdrop-blur-xl flex items-center gap-4">
                <button
                  onClick={() => { setShowExpressForm(false); setCsvFile(null); }}
                  className="flex-1 min-h-[52px] md:min-h-[56px] px-6 rounded-2xl font-black text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95 text-sm uppercase tracking-widest border border-gray-200 dark:border-gray-800"
                >
                  Fermer
                </button>
                {!csvProcessing && !expressProgress.success && (
                  <button
                    onClick={!csvValidation ? validateCsvFile : processExpressInventory}
                    disabled={!csvFile || !!(csvValidation && csvValidation.notFoundArticles.length > 0)}
                    className="flex-[2] min-h-[52px] md:min-h-[56px] px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white rounded-2xl font-black text-base shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 border border-white/20"
                  >
                    {!csvValidation ? <Search size={22} strokeWidth={3} /> : <CheckCircle size={22} strokeWidth={3} />}
                    <span>{!csvValidation ? "Vérifier le fichier" : "Importer"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Modale Création Inventaire */}
      {showCreateForm && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="glass w-full max-w-lg rounded-[3rem] border border-white/40 dark:border-gray-800/50 shadow-2xl p-8 space-y-8 animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-200">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Nouvelle Session</h2>
                  <p className="text-gray-500 font-medium">Initialiser une collecte de stock</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Libellé de la session</label>
                  <input
                    type="text"
                    value={newInventaireName}
                    onChange={(e) => setNewInventaireName(e.target.value)}
                    className="w-full px-8 py-5 bg-white dark:bg-gray-950 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] outline-none font-black text-xl text-gray-900 dark:text-white transition-all shadow-inner"
                    placeholder="Ex: Inventaire Annuel Q1"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Notes de mission</label>
                  <textarea
                    value={newInventaireDescription}
                    onChange={(e) => setNewInventaireDescription(e.target.value)}
                    className="w-full h-32 px-8 py-5 bg-white dark:bg-gray-950 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] outline-none font-bold text-gray-700 dark:text-gray-300 transition-all shadow-inner resize-none"
                    placeholder="Objectifs, zones cibles..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 pb-10 md:pb-4 border-t border-gray-100 dark:border-gray-800/50">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 min-h-[52px] md:min-h-[56px] px-6 rounded-2xl font-black text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95 text-sm uppercase tracking-widest border border-gray-200 dark:border-gray-800"
                >
                  Fermer
                </button>
                <button
                  onClick={handleCreateInventaire}
                  disabled={!newInventaireName.trim()}
                  className="flex-[2] min-h-[52px] md:min-h-[56px] px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white rounded-2xl font-black text-base shadow-xl shadow-indigo-500/20 transition-all active:scale-95 border border-white/20"
                >
                  Créer la session
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      {selectedInventaire && (
        <InventaireDetailModal
          inventaire={selectedInventaire}
          onClose={() => setSelectedInventaire(null)}
        />
      )}
    </div>
  );
}
