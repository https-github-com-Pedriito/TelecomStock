import React, { useEffect, useState } from 'react';
import { FileText, X, CheckCircle, Package, Loader2, Download, TrendingDown, Calendar, History, Activity, AlertCircle, ChevronRight, TrendingUp } from 'lucide-react';
import { Portal } from './Portal';
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

      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inventaire');

      worksheet.mergeCells('A1:F1');
      worksheet.getCell('A1').value = inventaire.nom;
      worksheet.getCell('A1').font = { bold: true, size: 16 };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A2:F2');
      worksheet.getCell('A2').value = inventaire.description || '';
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A3:F3');
      const dateStr = new Date(inventaire.created_at).toLocaleDateString('fr-FR');
      worksheet.getCell('A3').value = `Date: ${dateStr} - Statut: ${inventaire.statut} `;
      worksheet.getCell('A3').alignment = { horizontal: 'center' };

      worksheet.addRow([]);

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

      worksheet.columns = [
        { width: 30 },
        { width: 15 },
        { width: 18 },
        { width: 18 },
        { width: 12 },
        { width: 25 }
      ];

      const stats = calculateStats();
      worksheet.addRow([]);
      worksheet.addRow(['Statistiques']);
      worksheet.addRow(['Total articles', entries.length]);
      worksheet.addRow(['Articles OK', stats.articlesOk]);
      worksheet.addRow(['Articles manquants', stats.articlesManquants]);
      worksheet.addRow(['Articles excédents', stats.articlesExcedents]);
      worksheet.addRow(['Total comptabilisé', stats.totalComptee]);
      worksheet.addRow(['Total théorique', stats.totalTheorique]);

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
    <Portal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-950/40 backdrop-blur-md transition-opacity animate-fade-in"
          onClick={onClose}
        />

        {/* Modal Container */}
        <div className="relative w-full max-w-7xl glass rounded-[2rem] sm:rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[82dvh] sm:max-h-[90vh]">

          {/* Header */}
          <div className="relative px-6 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b border-white/20 dark:border-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-500/5 dark:bg-blue-950/20">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-blue-600 rounded-3xl shadow-lg shadow-blue-600/20 text-white">
                <FileText size={28} strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{inventaire.statut}</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rapport d'Audit</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate max-w-[300px] sm:max-w-md">
                  {inventaire.nom}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-gray-500">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                    <Calendar size={12} className="text-blue-500" />
                    {new Date(inventaire.created_at).toLocaleDateString('fr-FR')}
                  </div>
                  {inventaire.finalized_at && (
                    <>
                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                        <History size={12} className="text-emerald-500" />
                        Finalisé le {new Date(inventaire.finalized_at).toLocaleDateString('fr-FR')}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportExcel}
                disabled={exporting || entries.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all group"
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} strokeWidth={3} />}
                <span>{exporting ? 'Export...' : 'Exporter Excel'}</span>
              </button>
              <button
                onClick={onClose}
                className="p-3 hover:bg-white/40 dark:hover:bg-gray-800/40 rounded-2xl transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-90 border border-transparent hover:border-white/40"
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 p-4 sm:p-6 bg-gray-50/30 dark:bg-gray-950/20 border-b border-white/20 dark:border-gray-800/50">
            <StatCard label="Articles" value={entries.length} icon={<Package size={14} />} color="blue" />
            <StatCard label="Conformes" value={stats.articlesOk} icon={<CheckCircle size={14} />} color="emerald" />
            <StatCard label="Manquants" value={stats.articlesManquants} icon={<TrendingDown size={14} />} color="red" />
            <StatCard label="Excédents" value={stats.articlesExcedents} icon={<TrendingUp size={14} />} color="blue" />
            <StatCard label="Total Compté" value={stats.totalComptee} icon={<Activity size={14} />} color="indigo" />
            <StatCard
              label="Écart Global"
              value={`${stats.ecartTotal > 0 ? '+' : ''}${stats.ecartTotal}`}
              subValue={`${stats.ecartPct}%`}
              icon={<TrendingUp size={14} />}
              color={stats.ecartTotal === 0 ? 'emerald' : stats.ecartTotal > 0 ? 'blue' : 'red'}
            />
          </div>

          {/* Content Table */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white/20 dark:bg-transparent">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4 animate-fade-in">
                  <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Chargement des données...</p>
                </div>
              ) : error ? (
                <div className="h-full flex items-center justify-center p-8 animate-fade-in">
                  <div className="glass p-8 rounded-[2rem] border border-red-200 dark:border-red-900/30 max-w-md text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-3xl flex items-center justify-center mx-auto text-red-600">
                      <AlertCircle size={32} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Une erreur est survenue</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                    <button onClick={loadEntries} className="px-6 py-3 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors">Réessayer</button>
                  </div>
                </div>
              ) : entries.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4 text-gray-400 animate-fade-in">
                  <FileText size={48} strokeWidth={1} className="opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Aucune entrée répertoriée</p>
                </div>
              ) : (
                <div className="glass rounded-[2rem] border border-white/40 dark:border-gray-800/50 overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-white/20 dark:border-gray-800/50">
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Image</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Référence / Nom</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Quantités</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Écart</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Statut</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Audité par</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 dark:divide-gray-800/30">
                      {entries.map((entry) => {
                        const ecart = entry.quantite_comptee - entry.quantite_theorique;
                        const ecartPct = entry.quantite_theorique > 0
                          ? ((ecart / entry.quantite_theorique) * 100).toFixed(1)
                          : '0';

                        return (
                          <tr key={entry.id} className="group hover:bg-white/40 dark:hover:bg-gray-800/20 transition-all">
                            <td className="px-6 py-4">
                              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden border border-white/40 dark:border-gray-700/50 shadow-inner group-hover:scale-110 transition-transform">
                                {entry.article?.image_url ? (
                                  <img src={entry.article.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="text-gray-300 dark:text-gray-700" size={20} />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{entry.article?.nom || 'Inconnu'}</span>
                                <span className="text-[10px] font-bold text-gray-400 font-mono tracking-tight">{entry.article?.code_barres || 'Sans code-barre'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-4">
                                <div className="text-center">
                                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter mb-0.5">Compté</div>
                                  <div className="text-lg font-black text-blue-600 dark:text-blue-400">{entry.quantite_comptee}</div>
                                </div>
                                <div className="w-px h-8 bg-gray-200 dark:bg-gray-800" />
                                <div className="text-center">
                                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter mb-0.5">Théor.</div>
                                  <div className="text-lg font-bold text-gray-500">{entry.quantite_theorique}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`text-lg font-black ${ecart === 0 ? 'text-emerald-500' :
                                  ecart > 0 ? 'text-blue-500' : 'text-red-500'
                                  }`}>
                                  {ecart > 0 ? '+' : ''}{ecart}
                                </span>
                                <span className="text-[10px] font-black text-gray-400">
                                  {ecartPct}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                {ecart === 0 ? (
                                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/10">
                                    <CheckCircle size={20} strokeWidth={2.5} />
                                  </div>
                                ) : ecart > 0 ? (
                                  <div className="p-2 bg-blue-100 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/10">
                                    <TrendingUp size={20} strokeWidth={2.5} />
                                  </div>
                                ) : (
                                  <div className="p-2 bg-red-100 dark:bg-red-950/50 rounded-xl text-red-600 dark:text-red-400 shadow-sm border border-red-500/10">
                                    <TrendingDown size={20} strokeWidth={2.5} />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-blue-600/20">
                                  {entry.utilisateur?.prenom?.substring(0, 1)}{entry.utilisateur?.nom?.substring(0, 1)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-gray-900 dark:text-white">{entry.utilisateur?.prenom} {entry.utilisateur?.nom}</span>
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{entry.commentaire ? 'Note ajoutée' : 'Pas de note'}</span>
                                </div>
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
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-4 sm:py-6 border-t border-white/20 dark:border-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-white/20 dark:bg-gray-950/20 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-500/10 rounded-xl">
                <FileText size={16} className="text-gray-400" />
              </div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                {entries.length} items audités dans ce rapport
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-full sm:w-auto min-h-[52px] md:min-h-[56px] px-10 rounded-2xl font-black text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 flex items-center justify-center gap-3 group border border-gray-200 dark:border-gray-700"
            >
              <span className="text-sm uppercase tracking-widest">Quitter le Rapport</span>
              <ChevronRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// Sub-components
function StatCard({ label, value, subValue, icon, color }: { label: string; value: string | number; subValue?: string; icon: React.ReactNode; color: 'blue' | 'emerald' | 'red' | 'indigo' }) {
  const colors = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/10',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10',
    red: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20 shadow-red-500/10',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/10',
  };

  return (
    <div className={`glass p-4 rounded-3xl border border-white/40 dark:border-gray-800/50 flex flex-col items-center justify-center space-y-2 shadow-sm relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-12 h-12 opacity-5 translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform ${colors[color].split(' ')[0]}`}>
        {icon}
      </div>
      <div className={`p-2 rounded-xl scale-90 ${colors[color].split(' ').slice(0, 3).join(' ')}`}>
        {icon}
      </div>
      <div className="text-center">
        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</div>
        <div className="flex items-baseline justify-center gap-1">
          <div className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{value}</div>
          {subValue && <div className="text-[10px] font-black text-gray-400">({subValue})</div>}
        </div>
      </div>
    </div>
  );
}
