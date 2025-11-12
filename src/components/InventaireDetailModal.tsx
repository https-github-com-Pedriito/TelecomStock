import React, { useEffect, useState } from 'react';
import { X, Download, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Inventaire, InventaireEntry } from '../types';
import { api } from '../lib/api';

interface InventaireDetailModalProps {
  inventaire: Inventaire;
  onClose: () => void;
}

export function InventaireDetailModal({ inventaire, onClose }: InventaireDetailModalProps) {
  const [entries, setEntries] = useState<InventaireEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [inventaire.id]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await api.getInventaireEntries(inventaire.id);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des entrées');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      
      // Créer le workbook Excel avec les données
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inventaire');

      // Informations de l'inventaire
      worksheet.mergeCells('A1:F1');
      worksheet.getCell('A1').value = inventaire.nom;
      worksheet.getCell('A1').font = { bold: true, size: 16 };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A2:F2');
      worksheet.getCell('A2').value = inventaire.description || '';
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A3:F3');
      const dateStr = new Date(inventaire.created_at).toLocaleDateString('fr-FR');
      worksheet.getCell('A3').value = `Date: ${dateStr} - Statut: ${inventaire.statut}`;
      worksheet.getCell('A3').alignment = { horizontal: 'center' };

      // Ligne vide
      worksheet.addRow([]);

      // En-têtes des colonnes
      const headerRow = worksheet.addRow([
        'Article',
        'Code Barre',
        'Quantité Théorique',
        'Quantité Comptée',
        'Écart',
        'Comptabilisé par'
      ]);
      
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Données
      entries.forEach(entry => {
        const ecart = entry.quantite_comptee - entry.quantite_theorique;
        const row = worksheet.addRow([
          entry.article?.nom || 'Article inconnu',
          entry.article?.code_barres || '',
          entry.quantite_theorique,
          entry.quantite_comptee,
          ecart,
          entry.utilisateur?.prenom + ' ' + entry.utilisateur?.nom || 'Inconnu'
        ]);

        // Colorer les écarts
        if (ecart < 0) {
          row.getCell(5).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' }
          };
        } else if (ecart > 0) {
          row.getCell(5).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' }
          };
        }
      });

      // Ajuster la largeur des colonnes
      worksheet.columns = [
        { width: 30 },
        { width: 15 },
        { width: 18 },
        { width: 18 },
        { width: 12 },
        { width: 25 }
      ];

      // Ajouter les statistiques en bas
      const stats = calculateStats();
      worksheet.addRow([]);
      worksheet.addRow(['Statistiques']);
      worksheet.addRow(['Total articles', entries.length]);
      worksheet.addRow(['Articles OK', stats.articlesOk]);
      worksheet.addRow(['Articles manquants', stats.articlesManquants]);
      worksheet.addRow(['Articles excédents', stats.articlesExcedents]);
      worksheet.addRow(['Total comptabilisé', stats.totalComptee]);
      worksheet.addRow(['Total théorique', stats.totalTheorique]);

      // Générer le fichier
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const formattedDate = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const fileName = inventaire.nom.replace(/[^a-z0-9]/gi, '_');
      a.download = `${fileName}_${formattedDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Erreur export:', err);
      alert('Erreur lors de l\'export Excel: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setExporting(false);
    }
  };

  const calculateStats = () => {
    let totalComptee = 0;
    let totalTheorique = 0;
    let articlesOk = 0;
    let articlesManquants = 0;
    let articlesExcedents = 0;

    entries.forEach(entry => {
      totalComptee += entry.quantite_comptee;
      totalTheorique += entry.quantite_theorique;
      const ecart = entry.quantite_comptee - entry.quantite_theorique;
      
      if (ecart === 0) articlesOk++;
      else if (ecart < 0) articlesManquants++;
      else articlesExcedents++;
    });

    const ecartTotal = totalComptee - totalTheorique;
    const ecartPct = totalTheorique > 0 ? ((ecartTotal / totalTheorique) * 100).toFixed(2) : '0';

    return {
      totalComptee,
      totalTheorique,
      ecartTotal,
      ecartPct,
      articlesOk,
      articlesManquants,
      articlesExcedents
    };
  };

  const stats = calculateStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 pb-20">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header - Fixed, no scroll */}
        <div className="bg-blue-600 text-white p-4 flex-shrink-0 flex justify-between items-start">
          <div className="flex-1 overflow-hidden">
            <h2 className="text-xl font-bold mb-1 truncate" title={inventaire.nom}>
              {inventaire.nom}
            </h2>
            <p className="text-blue-100 text-sm truncate" title={inventaire.description}>
              {inventaire.description}
            </p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <span className="bg-blue-700 px-2 py-1 rounded whitespace-nowrap">
                {inventaire.statut}
              </span>
              <span className="whitespace-nowrap">
                Créé le {new Date(inventaire.created_at).toLocaleDateString('fr-FR')}
              </span>
              {inventaire.finalized_at && (
                <span className="whitespace-nowrap">
                  Finalisé le {new Date(inventaire.finalized_at).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 p-2 rounded flex-shrink-0 ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stats - Fixed, no scroll */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 p-3 bg-gray-50 border-b flex-shrink-0">
          <div className="bg-white p-2 rounded-lg shadow">
            <div className="text-xs text-gray-600 mb-1 truncate" title="Total Articles">Articles</div>
            <div className="text-lg font-bold truncate">{entries.length}</div>
          </div>
          <div className="bg-green-50 p-2 rounded-lg shadow border border-green-200">
            <div className="text-xs text-green-700 mb-1 truncate flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> OK
            </div>
            <div className="text-lg font-bold text-green-600 truncate">{stats.articlesOk}</div>
          </div>
          <div className="bg-red-50 p-2 rounded-lg shadow border border-red-200">
            <div className="text-xs text-red-700 mb-1 truncate flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Manq.
            </div>
            <div className="text-lg font-bold text-red-600 truncate">{stats.articlesManquants}</div>
          </div>
          <div className="bg-blue-50 p-2 rounded-lg shadow border border-blue-200">
            <div className="text-xs text-blue-700 mb-1 truncate flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Excéd.
            </div>
            <div className="text-lg font-bold text-blue-600 truncate">{stats.articlesExcedents}</div>
          </div>
          <div className="bg-blue-50 p-2 rounded-lg shadow border border-blue-200">
            <div className="text-xs text-blue-700 mb-1 truncate" title="Quantité Comptée">Qté Compt.</div>
            <div className="text-lg font-bold text-blue-600 truncate">{stats.totalComptee}</div>
          </div>
          <div className={`p-2 rounded-lg shadow border ${
            stats.ecartTotal === 0 ? 'bg-green-50 border-green-200' : 
            stats.ecartTotal > 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="text-xs mb-1 truncate" title="Écart Total">Écart</div>
            <div className={`text-lg font-bold truncate ${
              stats.ecartTotal === 0 ? 'text-green-600' : 
              stats.ecartTotal > 0 ? 'text-blue-600' : 'text-red-600'
            }`} title={`${stats.ecartTotal > 0 ? '+' : ''}${stats.ecartTotal} (${stats.ecartPct}%)`}>
              {stats.ecartTotal > 0 ? '+' : ''}{stats.ecartTotal}
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des données...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Erreur</h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune entrée dans cet inventaire
            </div>
          ) : (
            <div className="w-full">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Réf.
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compt.
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Théor.
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Écart
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Par
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commentaire
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.map((entry) => {
                    const ecart = entry.quantite_comptee - entry.quantite_theorique;
                    const ecartPct = entry.quantite_theorique > 0 
                      ? ((ecart / entry.quantite_theorique) * 100).toFixed(1)
                      : '0';

                    return (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-2 py-2">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mx-auto">
                            {entry.article?.image_url ? (
                              <img 
                                src={entry.article.image_url} 
                                alt={entry.article.nom}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling!.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <span className={`text-xs font-semibold text-gray-400 ${entry.article?.image_url ? 'hidden' : ''}`}>
                              {entry.article?.nom?.substring(0, 2).toUpperCase() || '??'}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-600 whitespace-nowrap hidden md:table-cell">
                          <div className="truncate max-w-[120px]" title={entry.article?.code_barres || 'N/A'}>
                            {entry.article?.code_barres || 'N/A'}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-semibold text-blue-600 whitespace-nowrap">
                          {entry.quantite_comptee}
                        </td>
                        <td className="px-2 py-2 text-center text-sm text-gray-600 whitespace-nowrap">
                          {entry.quantite_theorique}
                        </td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center">
                            <span className={`text-sm font-bold ${
                              ecart === 0 ? 'text-green-600' :
                              ecart > 0 ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              {ecart > 0 ? '+' : ''}{ecart}
                            </span>
                            <span className="text-xs text-gray-500">
                              {ecartPct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div title={ecart === 0 ? 'OK' : ecart > 0 ? 'Excédent' : 'Manquant'}>
                            {ecart === 0 ? (
                              <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                            ) : ecart > 0 ? (
                              <TrendingUp className="h-5 w-5 text-blue-600 mx-auto" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-red-600 mx-auto" />
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-500">
                          <div className="truncate max-w-[100px]" title={entry.utilisateur?.nom || 'N/A'}>
                            {entry.utilisateur?.nom || 'N/A'}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          <div className="truncate max-w-[200px]" title={entry.commentaire || '-'}>
                            {entry.commentaire || '-'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer - Fixed, no scroll */}
        <div className="border-t p-3 bg-gray-50 flex-shrink-0 flex flex-wrap justify-between items-center gap-2">
          <div className="text-sm text-gray-600 whitespace-nowrap">
            {entries.length} entrée(s) au total
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
            >
              Fermer
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting || entries.length === 0}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              <Download className="h-4 w-4 flex-shrink-0" />
              {exporting ? 'Export...' : 'Excel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
