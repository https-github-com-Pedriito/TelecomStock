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
      worksheet.getCell('A1').value = `Inventaire: ${inventaire.nom}`;
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
      a.download = `Inventaire_${inventaire.nom.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">{inventaire.nom}</h2>
            <p className="text-blue-100">{inventaire.description}</p>
            <div className="flex gap-4 mt-3 text-sm">
              <span className="bg-blue-700 px-3 py-1 rounded">
                {inventaire.statut}
              </span>
              <span>
                Créé le {new Date(inventaire.created_at).toLocaleDateString('fr-FR')}
              </span>
              {inventaire.finalized_at && (
                <span>
                  Finalisé le {new Date(inventaire.finalized_at).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 p-2 rounded"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50 border-b">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Total Articles</div>
            <div className="text-2xl font-bold">{entries.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Quantité Comptée</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalComptee}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Quantité Théorique</div>
            <div className="text-2xl font-bold text-gray-600">{stats.totalTheorique}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Écart Total</div>
            <div className={`text-2xl font-bold ${
              stats.ecartTotal === 0 ? 'text-green-600' : 
              stats.ecartTotal > 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
              {stats.ecartTotal > 0 ? '+' : ''}{stats.ecartTotal} ({stats.ecartPct}%)
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-4 px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">{stats.articlesOk} OK</span>
          </div>
          <div className="flex items-center gap-2 text-red-600">
            <TrendingDown className="h-5 w-5" />
            <span className="font-semibold">{stats.articlesManquants} Manquants</span>
          </div>
          <div className="flex items-center gap-2 text-blue-600">
            <TrendingUp className="h-5 w-5" />
            <span className="font-semibold">{stats.articlesExcedents} Excédents</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Article
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code Barres
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comptée
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Théorique
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Écart
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compté par
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.article?.nom || 'Article supprimé'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.article?.code_barres || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-blue-600">
                          {entry.quantite_comptee}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                          {entry.quantite_theorique}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`text-sm font-semibold ${
                            ecart === 0 ? 'text-green-600' :
                            ecart > 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {ecart > 0 ? '+' : ''}{ecart} ({ecartPct}%)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {ecart === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3" /> OK
                            </span>
                          ) : ecart > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <TrendingUp className="h-3 w-3" /> Excédent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <TrendingDown className="h-3 w-3" /> Manquant
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.utilisateur?.nom || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {entry.commentaire || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {entries.length} entrée(s) au total
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Fermer
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting || entries.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Export en cours...' : 'Télécharger Excel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
