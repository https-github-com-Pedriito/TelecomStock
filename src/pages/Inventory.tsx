import React, { useState } from 'react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { InventoryEntry } from '../types';
import { ScanLine, FileText, Filter, Edit2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryProps {
  articles: any[];
  currentUser: any;
  users: any[]; // Ajout des utilisateurs pour avoir accès à leurs noms
  addInventoryEntry: (entry: Omit<InventoryEntry, 'id' | 'dateHeure'>) => InventoryEntry;
  finalizeInventoryReport: (managerId: string, mois: number, annee: number) => any;
  getArticleByCodeBarres: (code: string) => any;
}

export function Inventory({ articles, currentUser, users, addInventoryEntry, finalizeInventoryReport, getArticleByCodeBarres }: InventoryProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [quantite, setQuantite] = useState<number>(0);
  const [entries, setEntries] = useState<any[]>([]);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  const submitCount = () => {
    if (!selectedArticleId) return alert('Sélectionnez un article');
    
    if (editingEntry) {
      // Mise à jour d'une entrée existante
      const updatedEntry = addInventoryEntry({ 
        articleId: selectedArticleId, 
        quantiteCompte: quantite, 
        utilisateurId: currentUser.id, 
        utilisateurRole: currentUser.role 
      });
      setEntries(prev => prev.map(e => e.id === editingEntry.id ? updatedEntry : e));
      setEditingEntry(null);
    } else {
      // Nouvelle entrée
      const entry = addInventoryEntry({ 
        articleId: selectedArticleId, 
        quantiteCompte: quantite, 
        utilisateurId: currentUser.id, 
        utilisateurRole: currentUser.role 
      });
      setEntries(prev => [...prev, entry]);
    }
    
    setSelectedArticleId('');
    setQuantite(0);
    alert('Comptage enregistré');
  };

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    const found = getArticleByCodeBarres(barcode);
    if (!found) {
      alert("Article non trouvé dans la base — impossible d'enregistrer");
      return;
    }
    setSelectedArticleId(found.id);
    setQuantite(1);
  };

  const downloadExcel = (data: any, filename: string) => {
    // S'assurer que nous avons les données
    if (!data || !data.items || !Array.isArray(data.items)) {
      throw new Error('Format de données invalide');
    }
    
    // Préparer les données pour Excel avec des en-têtes plus détaillés
    const headers = [
      'Article',
      'Code Barre',
      'Stock Initial',
      'Quantité Totale Comptée',
      'Différence',
      'Détail des Comptages',
      'Date du Rapport'
    ];
    
    // Convertir les données en lignes
    const rows = data.items.map((item: any) => {
      const article = articles.find(a => a.id === item.articleId);
      const stockInitial = article?.quantite || 0;
      const difference = item.totalCompte - stockInitial;
      
      // Formater les comptages par utilisateur avec leurs noms
      const comptagePar = item.parUtilisateur
        .map((p: any) => {
          const user = users.find(u => u.id === p.utilisateurId);
          const userName = user ? `${user.prenom} ${user.nom}` : p.utilisateurId;
          return `${userName}: ${p.quantite} pièces`;
        })
        .join('\n');

      const dateRapport = `${data.mois.toString().padStart(2, '0')}/${data.annee}`;
      return [
        article?.nom || 'Inconnu',
        article?.codeBarres || 'N/A',
        stockInitial,
        item.totalCompte,
        difference,
        comptagePar, // Maintenant contient "Prénom Nom: X pièces" pour chaque comptage
        dateRapport
      ];
    });

    // Créer un workbook et une worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventaire");

    // Ajouter des styles et mettre en forme le tableau
    ws['!cols'] = headers.map(() => ({ wch: 15 })); // Largeur par défaut
    
    // Ajuster certaines colonnes spécifiques
    ws['!cols'][0] = { wch: 30 }; // Nom d'article
    ws['!cols'][5] = { wch: 40 }; // Comptage par utilisateur

    // Appliquer des styles aux cellules (en-têtes en gras)
    for (let i = 0; i < headers.length; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: "CCCCCC" } } };
    }

    // Ajuster les largeurs de colonnes
    const maxWidth = rows.reduce((acc: any, row: any) => {
      row.forEach((cell: any, i: number) => {
        const length = cell ? cell.toString().length : 0;
        acc[i] = Math.max(acc[i] || 0, length);
      });
      return acc;
    }, headers.map(h => h.length));

    ws['!cols'] = maxWidth.map((w: number) => ({ wch: w + 2 }));

    // Sauvegarder le fichier
    XLSX.writeFile(wb, filename, {
      bookType: 'xlsx',
      bookSST: false,
      type: 'array',
      compression: true
    });
  };

  const finalize = () => {
    if (currentUser.role !== 'manager' && currentUser.role !== 'admin') {
      return alert("Seul le manager peut finaliser l'inventaire");
    }
    const now = new Date();
    const rep = finalizeInventoryReport(currentUser.id, now.getMonth() + 1, now.getFullYear());
    
    console.log('Rapport généré:', rep); // Pour debug
    
    if (!rep) {
      alert("Erreur lors de la génération du rapport");
      return;
    }

    // Générer le nom du fichier avec la date
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const filename = `inventaire_${month}_${year}.csv`;
    
    try {
      // Télécharger le rapport en Excel
      downloadExcel(rep, filename.replace('.csv', '.xlsx'));
      alert("Rapport d'inventaire généré et téléchargé");
    } catch (err) {
      console.error('Erreur lors de la génération du fichier Excel:', err);
      alert("Erreur lors de la génération du fichier Excel");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventaire</h1>
          <p className="text-gray-600">Soumettez l'inventaire des stocks — les techniciens enregistrent, l'inventoriste finalise.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
          >
            <ScanLine size={16} />
            Ouvrir le scanner
          </button>
          {(currentUser.role === 'manager' || currentUser.role === 'admin') && (
            <button 
              onClick={finalize} 
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <FileText size={16} />
              Générer le rapport
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={selectedArticleId}
                onChange={(e) => setSelectedArticleId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">Sélectionner un article</option>
                {articles.map(a => (
                  <option key={a.id} value={a.id}>{a.nom} — {a.codeBarres}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <input
              type="number"
              value={quantite}
              onChange={(e) => setQuantite(parseInt(e.target.value || '0'))}
              className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Quantité"
            />
          </div>

          <div className="flex items-center">
            <button 
              onClick={submitCount} 
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              {editingEntry ? 'Modifier' : 'Enregistrer'}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold">Articles scannés</h2>
          <div className="mt-3">
            {entries.length === 0 ? (
              <p className="text-gray-500">Aucun comptage enregistré localement</p>
            ) : (
              <ul className="divide-y">
                {entries.map(en => {
                  const art = articles.find(a => a.id === en.articleId);
                  const name = art ? art.nom : en.articleId;
                  return (
                    <li key={en.id} className="py-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600">Quantité: {en.quantiteCompte}</span>
                          <button
                            onClick={() => {
                              setEditingEntry(en);
                              setSelectedArticleId(en.articleId);
                              setQuantite(en.quantiteCompte);
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full"
                          >
                            <Edit2 size={16} className="text-gray-500" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg max-w-lg w-full m-4">
            <h2 className="text-lg font-semibold mb-4">Scanner un article</h2>
            <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
