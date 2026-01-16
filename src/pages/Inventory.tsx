import { useState, useEffect } from 'react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { InventaireDetailModal } from '../components/InventaireDetailModal';
import { useInventaire } from '../hooks/useInventaire';
import { api } from '../lib/api';
import { ScanLine, FileText, Plus, Archive, Eye, List, Package, Trash2, CheckCircle, Rocket, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const [itemsPerPageInventaires, setItemsPerPageInventaires] = useState(10);
  
  // États pour le formulaire de comptage
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [quantiteComptee, setQuantiteComptee] = useState<number>(0);
  const [commentaire, setCommentaire] = useState('');
  
  // États pour l'inventaire express
  const [showExpressForm, setShowExpressForm] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
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

  const handleItemsPerPageChangeInventaires = (newItemsPerPage: number) => {
    setItemsPerPageInventaires(newItemsPerPage);
    setCurrentPageInventaires(1); // Réinitialiser à la première page
  };

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

  const downloadExcel = (entries: any[]) => {
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

      {/* Header sticky moderne */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 py-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Package size={28} className="text-blue-600 dark:text-blue-400" /> Inventaire
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-base">
            {currentInventaire
              ? <span className="font-semibold text-blue-700 dark:text-blue-300">{currentInventaire.nom}</span>
              : <span className="italic">Aucun inventaire en cours — créez-en un nouveau</span>
            }
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!currentInventaire && (
            <>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-md transition-colors"
              >
                <Plus size={18} /> Nouvel inventaire
              </button>
              <button
                onClick={() => setShowExpressForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold shadow-md transition-colors"
              >
                <Rocket size={18} /> Inventaire Express
              </button>
            </>
          )}
          {currentInventaire && (
            <>
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg font-semibold shadow-sm transition-colors"
              >
                <ScanLine size={18} /> Scanner
              </button>
              {(currentUser.role === 'manager' || currentUser.role === 'admin') && (
                <button
                  onClick={handleFinalize}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition-colors"
                >
                  <FileText size={18} /> Finaliser
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Guide complet quand aucun inventaire n'est en cours */}
      {!currentInventaire && (
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-2xl shadow-lg p-8 border-2 border-blue-200 dark:border-blue-800">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                <Package className="text-white" size={32} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                Comment réaliser un inventaire ?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Suivez ce guide étape par étape pour effectuer un inventaire complet
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Étape 1 */}
              <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 rounded-xl p-5 border border-blue-200 dark:border-blue-700 shadow-sm text-center sm:text-left items-center sm:items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                    Créer un nouvel inventaire
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Cliquez sur le bouton "Nouvel inventaire" pour démarrer. Donnez-lui un nom (ex: Inventaire Janvier 2026) et une description optionnelle.
                  </p>
                </div>
              </div>
              
              {/* Étape 2 */}
              <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 rounded-xl p-5 border border-green-200 dark:border-green-700 shadow-sm text-center sm:text-left items-center sm:items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                    Compter les équipements
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                    Recherchez chaque équipement par nom, code-barres ou scannez-le. Saisissez la quantité réellement comptée en stock.
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    L'application comparera automatiquement avec le stock théorique et affichera les écarts (surplus en vert, manques en rouge).
                  </p>
                </div>
              </div>
              
              {/* Étape 3 */}
              <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 rounded-xl p-5 border border-purple-200 dark:border-purple-700 shadow-sm text-center sm:text-left items-center sm:items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                    Finaliser l'inventaire
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                    Une fois tous les équipements comptés, cliquez sur "Finaliser". Les stocks seront automatiquement mis à jour selon vos comptages. Par la suite un fichier Excel récapitulatif sera généré et automatiquement téléchargé.
                  </p>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mt-3">
                    <p className="text-sm text-red-700 dark:text-red-400 font-semibold flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      Important : Un inventaire en cours ne peut pas être annulé, il doit obligatoirement être finalisé.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
              >
                <Plus size={24} />
                Créer mon premier inventaire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de comptage - affiché EN PREMIER si inventaire en cours (sauf si inventaire express) */}
      {currentInventaire && !currentInventaire.description?.includes('[EXPRESS]') && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-blue-100 dark:border-blue-900">
          {/* Guide utilisateur - Étape 1 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-1">
                  Sélectionnez un article à compter
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Recherchez l'article par son nom, code-barres ou catégorie. Vous pouvez aussi utiliser le scanner pour plus de rapidité.
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-400 mt-2 font-semibold">
                  ⚠️ Important : Un inventaire en cours ne peut pas être annulé, il doit être finalisé pour mettre à jour les stocks.
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="text-blue-600 dark:text-blue-400" size={24} />
            Enregistrer un comptage
          </h2>
          
          {/* Recherche d'article */}
          <div className="space-y-4">
            {/* Suggestions - 3 articles les plus utilisés */}
            {!selectedArticle && mostSearchedArticles.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3">
                  💡 Suggestion : Les 3 articles les plus utilisés
                </p>
                <div className="flex flex-wrap gap-2">
                  {mostSearchedArticles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => {
                        setSelectedArticle(article);
                        setQuantiteComptee(article.quantite_stock || 0);
                      }}
                      className="px-4 py-2 bg-white dark:bg-gray-800 border-2 border-green-300 dark:border-green-700 hover:border-green-500 dark:hover:border-green-500 rounded-lg text-sm font-medium text-gray-900 dark:text-white transition-colors shadow-sm hover:shadow-md"
                    >
                      <div className="font-semibold">{article.nom}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Stock: {article.quantite_stock}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un article par nom, code-barres ou catégorie..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && filteredArticles.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredArticles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => {
                        setSelectedArticle(article);
                        setSearchQuery('');
                        setQuantiteComptee(article.quantite_stock || 0);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="font-semibold text-gray-900 dark:text-white">{article.nom}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Stock: {article.quantite_stock} • {article.code_barres}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Article sélectionné */}
            {selectedArticle && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{selectedArticle.nom}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Stock théorique: {selectedArticle.quantite_stock}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedArticle(null);
                      setQuantiteComptee(0);
                      setCommentaire('');
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Quantité comptée */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantité comptée
                  </label>
                  <input
                    type="number"
                    value={quantiteComptee}
                    onChange={(e) => setQuantiteComptee(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl font-bold"
                    min="0"
                  />
                  {quantiteComptee !== selectedArticle.quantite_stock && (
                    <div className={`mt-2 text-center font-semibold ${quantiteComptee > selectedArticle.quantite_stock ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      Écart: {quantiteComptee > selectedArticle.quantite_stock ? '+' : ''}{quantiteComptee - selectedArticle.quantite_stock}
                    </div>
                  )}
                </div>
                
                {/* Commentaire optionnel */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Commentaire (optionnel)
                  </label>
                  <textarea
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    placeholder="Ajouter un commentaire..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
                
                <button
                  onClick={handleSubmitCount}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  <CheckCircle size={22} />
                  Enregistrer le comptage
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Liste des articles comptés - DIRECTEMENT APRÈS le formulaire */}
      {currentInventaire && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
                <List size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              Articles comptés
              <span className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full text-base font-semibold text-blue-700 dark:text-blue-300">
                {currentEntries.length}
              </span>
            </h2>
            {currentEntries.length > 0 && (
              <button
                onClick={() => downloadExcel(currentEntries)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <FileText size={18} />
                Exporter Excel
              </button>
            )}
          </div>
          
          {currentEntries.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-700">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Aucun article compté
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Commencez par rechercher et sélectionner un article à compter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentEntries.map(entry => {
                const article = articles.find(a => a.id === entry.article_id);
                const user = users.find(u => u.id === entry.utilisateur_id);
                const difference = entry.quantite_comptee - entry.quantite_theorique;
                const avatar = user ? `${user.prenom[0] || ''}${user.nom[0] || ''}`.toUpperCase() : '?';
                return (
                  <div key={entry.id} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow group">
                    {/* Avatar utilisateur */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-lg font-bold text-blue-700 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700">
                        {avatar}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user ? user.prenom : 'Utilisateur'}</span>
                    </div>
                    {/* Infos article */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg text-gray-900 dark:text-white truncate flex items-center gap-2">
                        {article?.nom || 'Article inconnu'}
                        {difference !== 0 && (
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold tracking-wide ${difference > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                            {difference > 0 ? '+' : ''}{difference}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Théorique: <span className="font-medium">{entry.quantite_theorique}</span> • Compté: <span className="font-medium">{entry.quantite_comptee}</span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Par: {user ? `${user.prenom} ${user.nom}` : entry.utilisateur_id} • Le: {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                        {entry.commentaire && <span> • {entry.commentaire}</span>}
                      </div>
                    </div>
                    {/* Actions rapides */}
                    {entry.utilisateur_id === currentUser.id && (
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors ml-2"
                        title="Supprimer"
                      >
                        <Trash2 size={16} className="text-red-500 dark:text-red-400" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bloc de finalisation */}
          {currentEntries.length > 0 && (
            <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl shadow-lg">
              <div className="max-w-2xl mx-auto">
                {/* Guide final */}
                <div className="bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                      ✓
                    </div>
                    <div>
                      <h3 className="font-bold text-purple-900 dark:text-purple-300 mb-1">
                        Finaliser l'inventaire
                      </h3>
                      <p className="text-sm text-purple-700 dark:text-purple-400">
                        Une fois tous les articles comptés, finalisez l'inventaire pour mettre à jour les stocks automatiquement.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full border border-purple-200 dark:border-purple-700">
                    <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {currentEntries.length} article{currentEntries.length > 1 ? 's' : ''} compté{currentEntries.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={handleFinalize}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-5 rounded-xl transition-all flex items-center justify-center gap-3 text-xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-[1.02]"
                >
                  <CheckCircle size={28} />
                  Finaliser et mettre à jour les stocks
                </button>
                
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400 text-center font-semibold flex items-center justify-center gap-2">
                    <span className="text-lg">⚠️</span>
                    Action irréversible - Les stocks seront automatiquement ajustés
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historique des inventaires - MAINTENANT EN BAS */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-800 animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
          <Archive size={22} className="text-blue-600 dark:text-blue-400" /> Historique des inventaires
        </h2>
        {inventaires.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Aucun inventaire trouvé</p>
        ) : (
          <>
            <ol className="relative border-l-2 border-blue-200 dark:border-blue-800 ml-2 space-y-0.5 mb-8">
              {inventaires
                .slice((currentPageInventaires - 1) * itemsPerPageInventaires, currentPageInventaires * itemsPerPageInventaires)
                .map((inv) => (
                <li key={inv.id} className="mb-6 ml-6 group">
                  <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white dark:ring-gray-900 border-2 ${
                    inv.statut === 'EN_COURS' ? 'bg-green-500 border-green-700' :
                    inv.statut === 'FINALISE' ? 'bg-blue-500 border-blue-700' :
                    'bg-gray-400 border-gray-600'
                  }`} />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors">
                    <div>
                      <div className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        {inv.nom}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold tracking-wide ${
                          inv.statut === 'EN_COURS' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          inv.statut === 'FINALISE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                          {inv.statut}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {inv.description} • <span className="italic">Créé le {new Date(inv.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center mt-2 sm:mt-0">
                      <button
                        onClick={() => setSelectedInventaire(inv)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-semibold shadow-md transition-colors"
                      >
                        <Eye size={16} /> Voir détails
                      </button>
                      {inv.statut === 'FINALISE' && (
                        <Archive className="text-gray-400 dark:text-gray-500" size={20} />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            {/* Pagination */}
            {inventaires.length > 10 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Informations de pagination */}
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Affichage de{' '}
                      <span className="font-medium">
                        {inventaires.length === 0 ? 0 : (currentPageInventaires - 1) * itemsPerPageInventaires + 1}
                      </span>
                      {' '}à{' '}
                      <span className="font-medium">
                        {Math.min(currentPageInventaires * itemsPerPageInventaires, inventaires.length)}
                      </span>
                      {' '}sur{' '}
                      <span className="font-medium">{inventaires.length}</span>
                      {' '}inventaires
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Afficher par page:
                      </label>
                      <select
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        value={itemsPerPageInventaires}
                        onChange={(e) => handleItemsPerPageChangeInventaires(Number(e.target.value))}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  {/* Navigation des pages */}
                  <div className="flex flex-col items-stretch md:items-center gap-3">
                    {/* Indicateur de page */}
                    <div className="text-sm text-gray-700 dark:text-gray-300 text-center">
                      Page <span className="font-semibold text-blue-600 dark:text-blue-400">{currentPageInventaires}</span> sur{' '}
                      <span className="font-semibold">{Math.ceil(inventaires.length / itemsPerPageInventaires)}</span>
                    </div>

                    {/* Boutons de pagination */}
                    <nav className="flex items-center gap-1" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPageInventaires(1)}
                        disabled={currentPageInventaires === 1}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Première page"
                      >
                        ⏮
                      </button>
                      <button
                        onClick={() => setCurrentPageInventaires(Math.max(1, currentPageInventaires - 1))}
                        disabled={currentPageInventaires === 1}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Page précédente"
                      >
                        ← Précédent
                      </button>

                      {/* Sélecteur de page */}
                      <select
                        value={currentPageInventaires}
                        onChange={(e) => setCurrentPageInventaires(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      >
                        {Array.from({ length: Math.ceil(inventaires.length / itemsPerPageInventaires) }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => setCurrentPageInventaires(Math.min(Math.ceil(inventaires.length / itemsPerPageInventaires), currentPageInventaires + 1))}
                        disabled={currentPageInventaires === Math.ceil(inventaires.length / itemsPerPageInventaires)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Page suivante"
                      >
                        Suivant →
                      </button>
                      <button
                        onClick={() => setCurrentPageInventaires(Math.ceil(inventaires.length / itemsPerPageInventaires))}
                        disabled={currentPageInventaires === Math.ceil(inventaires.length / itemsPerPageInventaires)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Dernière page"
                      >
                        ⏭
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modale Inventaire Express */}
      {showExpressForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => {
                setShowExpressForm(false);
                setCsvFile(null);
                setCsvValidation(null);
                setCsvValidationError(null);
                setExpressProgress({ currentStep: '', processed: 0, total: 0, errors: [], success: false });
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl font-bold"
              aria-label="Fermer"
            >×</button>
            
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 rounded-xl">
                  <Rocket size={28} className="text-white" />
                </div>
                Inventaire Express
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Importez rapidement un inventaire complet via fichier CSV
              </p>
            </div>
            
            {/* Guide rapide */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                <span className="text-xl">💡</span>
                Comment ça marche ?
              </h3>
              <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>Téléchargez le template CSV ci-dessous</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>Remplissez-le avec vos données :
                    <br/><strong>Obligatoires :</strong> nom, référence, quantité, localisation
                    <br/><strong>Optionnels :</strong> catégorie, fournisseur, seuil_min, prix</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>Importez le fichier ici (glisser-déposer ou cliquer)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">4.</span>
                  <span>L'inventaire sera créé automatiquement avec tous les comptages</span>
                </li>
              </ol>
            </div>
            
            {/* Télécharger le template */}
            {!csvProcessing && !expressProgress.success && (
              <button
                onClick={downloadCsvTemplate}
                className="w-full mb-6 flex items-center justify-center gap-3 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg transition-colors"
              >
                <Download size={24} />
                Télécharger le template CSV
              </button>
            )}
            
            {/* Zone de drop - MASQUÉE pendant le traitement */}
            {!csvProcessing && !expressProgress.success && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-3 border-dashed rounded-2xl p-12 text-center transition-all ${
                isDragging
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : csvFile
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
              }`}
            >
              {csvFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mx-auto">
                    <FileText size={40} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-xl text-gray-900 dark:text-white mb-1">
                      {csvFile.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {(csvFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCsvFile(null);
                      setCsvValidation(null);
                    }}
                    className="text-red-600 hover:text-red-700 font-semibold"
                  >
                    Supprimer
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-20 h-20 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto">
                    <Upload size={40} className="text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-bold text-xl text-gray-900 dark:text-white mb-2">
                      Glissez-déposez votre fichier CSV ici
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      ou
                    </p>
                    <label className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer transition-colors">
                      Parcourir les fichiers
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
            )}
            
            {/* Format requis - MASQUÉ pendant le traitement */}
            {!csvProcessing && !expressProgress.success && (
            <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">Format du fichier CSV :</h4>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                <div className="text-purple-600 dark:text-purple-400 font-bold mb-1">nom,reference,quantite,localisation,categorie,fournisseur,seuil_min,prix</div>
                <div className="text-gray-700 dark:text-gray-300">Câble HDMI 2m,CAB-HDMI-002,15,Entrepôt A - Rayon 3,Câbles,TechSupply,5,12.50</div>
                <div className="text-gray-700 dark:text-gray-300">Adaptateur USB-C,ADP-USBC-001,42,Entrepôt B - Rayon 1,Adaptateurs,ElectroPro,10,8.90</div>
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">Champs obligatoires :</span> nom, reference, quantite, localisation
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">Champs optionnels :</span> categorie, fournisseur, seuil_min, prix
                </p>
                <p className="text-orange-600 dark:text-orange-400 font-semibold mt-2">
                  ⚠️ Les articles doivent exister dans votre base (correspondance par nom ou référence)
                </p>
              </div>
            </div>
            )}
            
            {/* Erreur de validation - MASQUÉ pendant le traitement */}
            {!csvProcessing && !expressProgress.success && csvValidationError && (
              <div className="mt-6">
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-red-600 rounded-full flex-shrink-0">
                      <span className="text-white text-2xl font-bold">×</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-red-900 dark:text-red-300 text-lg">
                        ❌ Erreur de validation
                      </p>
                      <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                        {csvValidationError}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Résultats de validation - MASQUÉ pendant le traitement */}
            {!csvProcessing && !expressProgress.success && csvValidation && (
              <div className="mt-6">
                {csvValidation.notFoundArticles.length === 0 ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-600 rounded-full">
                        <CheckCircle size={24} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-green-900 dark:text-green-300 text-lg">
                          ✅ Validation réussie !
                        </p>
                        <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                          Tous les {csvValidation.totalArticles} articles ont été trouvés dans la base de données
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-red-600 rounded-full flex-shrink-0">
                        <span className="text-white text-2xl font-bold">×</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-red-900 dark:text-red-300 text-lg">
                          ❌ Validation échouée
                        </p>
                        <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                          {csvValidation.notFoundArticles.length} article(s) sur {csvValidation.totalArticles} n'ont pas été trouvés
                        </p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                      <h5 className="font-bold text-red-900 dark:text-red-300 mb-2">Articles non trouvés :</h5>
                      <ul className="space-y-1 text-sm">
                        {csvValidation.notFoundArticles.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-red-800 dark:text-red-400">
                            <span className="text-red-500 font-bold">•</span>
                            <span>
                              <strong>Ligne {item.ligne}:</strong> {item.nom} (Réf: {item.reference})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-500 mt-3 font-semibold">
                      ⚠️ Corrigez le fichier CSV ou ajoutez ces articles à la base de données avant de continuer
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Bouton de traitement - MASQUÉ pendant le traitement */}
            {!csvProcessing && !expressProgress.success ? (
              <div className="flex gap-3 mt-6">
                {!csvValidation ? (
                  <button
                    onClick={validateCsvFile}
                    disabled={!csvFile}
                    className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-bold text-lg shadow-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={24} />
                    Vérifier le fichier CSV
                  </button>
                ) : csvValidation.notFoundArticles.length === 0 ? (
                  <>
                    <button
                      onClick={processExpressInventory}
                      disabled={csvProcessing}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-bold text-lg shadow-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Rocket size={24} />
                      Finaliser l'inventaire
                    </button>
                    <button
                      onClick={() => {
                        setCsvFile(null);
                        setCsvValidation(null);
                      }}
                      className="px-6 py-4 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-semibold text-lg transition-colors"
                    >
                      Changer de fichier
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      disabled
                      className="flex-1 px-6 py-4 bg-gray-400 text-white rounded-xl font-bold text-lg shadow-lg cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Rocket size={24} />
                      Validation requise
                    </button>
                    <button
                      onClick={() => {
                        setCsvFile(null);
                        setCsvValidation(null);
                      }}
                      className="px-6 py-4 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-semibold text-lg transition-colors"
                    >
                      Changer de fichier
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowExpressForm(false);
                    setCsvFile(null);
                    setCsvValidation(null);
                  }}
                  className="px-6 py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-lg transition-colors"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {/* Barre de progression */}
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-pink-600 h-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
                    style={{ width: `${expressProgress.total > 0 ? (expressProgress.processed / expressProgress.total) * 100 : 0}%` }}
                  >
                    {expressProgress.total > 0 && (
                      <span className="text-xs font-bold text-white">
                        {Math.round((expressProgress.processed / expressProgress.total) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Étape en cours */}
                <div className={`${
                  expressProgress.success 
                    ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700'
                    : expressProgress.currentStep.includes('❌')
                    ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700'
                } rounded-xl p-4`}>
                  <div className="flex items-center gap-3">
                    {!expressProgress.success && !expressProgress.currentStep.includes('❌') && (
                      <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent" />
                    )}
                    {expressProgress.success && (
                      <div className="flex items-center justify-center w-8 h-8 bg-green-600 rounded-full">
                        <span className="text-white text-2xl">✓</span>
                      </div>
                    )}
                    {expressProgress.currentStep.includes('❌') && (
                      <div className="flex items-center justify-center w-8 h-8 bg-red-600 rounded-full">
                        <span className="text-white text-2xl">✕</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className={`font-bold text-lg ${
                        expressProgress.success 
                          ? 'text-green-900 dark:text-green-300'
                          : expressProgress.currentStep.includes('❌')
                          ? 'text-red-900 dark:text-red-300'
                          : 'text-blue-900 dark:text-blue-300'
                      }`}>
                        {expressProgress.currentStep}
                      </p>
                      {expressProgress.currentArticle && !expressProgress.success && (
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                          Article: {expressProgress.currentArticle}
                        </p>
                      )}
                      {expressProgress.total > 0 && !expressProgress.success && (
                        <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
                          {expressProgress.processed} / {expressProgress.total} articles traités
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Erreurs en temps réel */}
                {expressProgress.errors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-4 max-h-48 overflow-y-auto">
                    <h4 className="font-bold text-red-900 dark:text-red-300 mb-2 flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      Erreurs détectées ({expressProgress.errors.length})
                    </h4>
                    <ul className="space-y-1 text-sm text-red-800 dark:text-red-400">
                      {expressProgress.errors.slice(-10).map((error, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-500">•</span>
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                    {expressProgress.errors.length > 10 && (
                      <p className="text-xs text-red-600 dark:text-red-500 mt-2">
                        ... et {expressProgress.errors.length - 10} autres erreurs
                      </p>
                    )}
                  </div>
                )}
                
                {!expressProgress.success && !expressProgress.currentStep.includes('❌') && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-400 font-semibold text-center">
                      ⏳ Veuillez patienter, ne fermez pas cette fenêtre...
                    </p>
                  </div>
                )}
                
                {expressProgress.currentStep.includes('❌') && (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setCsvFile(null);
                        setCsvValidation(null);
                        setExpressProgress({ currentStep: '', processed: 0, total: 0, errors: [], success: false });
                      }}
                      className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Rocket size={24} />
                      Créer un nouvel inventaire express
                    </button>
                  </div>
                )}

                {expressProgress.success && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Cliquez sur le <strong>✕</strong> en haut à droite pour fermer cette fenêtre
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800 w-full max-w-md mx-auto relative">
            <button
              onClick={() => setShowCreateForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl font-bold"
              aria-label="Fermer"
            >×</button>
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <Plus size={22} className="text-green-600 dark:text-green-400" /> Créer un nouvel inventaire
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom de l'inventaire
                </label>
                <input
                  type="text"
                  value={newInventaireName}
                  onChange={(e) => setNewInventaireName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold transition-all"
                  placeholder="Ex: Inventaire Janvier 2024"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newInventaireDescription}
                  onChange={(e) => setNewInventaireDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base transition-all"
                  rows={3}
                  placeholder="Description de l'inventaire..."
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleCreateInventaire}
                  disabled={!newInventaireName.trim()}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-bold text-lg shadow-md transition-colors"
                >
                  Créer
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold text-lg transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg max-w-lg w-full m-4 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Scanner un article</h2>
            <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
          </div>
        </div>
      )}

      {/* Modale de détails de l'inventaire */}
      {selectedInventaire && (
        <InventaireDetailModal
          inventaire={selectedInventaire}
          onClose={() => setSelectedInventaire(null)}
        />
      )}
    </div>
  );
}
