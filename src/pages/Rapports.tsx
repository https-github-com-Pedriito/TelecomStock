import React, { useState, useMemo } from 'react';
import { Article, Mouvement, RapportMensuel } from '../types';
import { FileText, Download, Calendar, TrendingUp, TrendingDown, Package, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RapportsProps {
  articles: Article[];
  mouvements: Mouvement[];
  articlesWithAlerts: Article[];
}

export function Rapports({ articles, mouvements, articlesWithAlerts }: RapportsProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const rapportMensuel = useMemo((): RapportMensuel => {
    const [annee, mois] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(annee, mois - 1));
    const endDate = endOfMonth(new Date(annee, mois - 1));

    const mouvementsDuMois = mouvements.filter(mouvement =>
      isWithinInterval(new Date(mouvement.dateHeure), { start: startDate, end: endDate })
    );

    const articlesDuMois = articles.filter(article =>
      isWithinInterval(new Date(article.createdAt), { start: startDate, end: endDate })
    );

    const totalEntrees = mouvementsDuMois
      .filter(m => m.type === 'ENTREE')
      .reduce((sum, m) => sum + m.quantite, 0);

    const totalSorties = mouvementsDuMois
      .filter(m => m.type === 'SORTIE')
      .reduce((sum, m) => sum + m.quantite, 0);

    const mouvementsParCategorie = mouvementsDuMois.reduce((acc, mouvement) => {
      const article = articles.find(a => a.id === mouvement.articleId);
      if (article) {
        if (!acc[article.categorie]) {
          acc[article.categorie] = { entrees: 0, sorties: 0 };
        }
        if (mouvement.type === 'ENTREE') {
          acc[article.categorie].entrees += mouvement.quantite;
        } else {
          acc[article.categorie].sorties += mouvement.quantite;
        }
      }
      return acc;
    }, {} as Record<string, { entrees: number; sorties: number }>);

    const topArticles = Object.entries(
      mouvementsDuMois.reduce((acc, mouvement) => {
        const article = articles.find(a => a.id === mouvement.articleId);
        if (article) {
          acc[article.nom] = (acc[article.nom] || 0) + mouvement.quantite;
        }
        return acc;
      }, {} as Record<string, number>)
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([nom, quantite]) => ({ nom, quantite }));

    return {
      mois: format(startDate, 'MMMM yyyy', { locale: fr }),
      annee,
      totalEntrees,
      totalSorties,
      articlesAjoutes: articlesDuMois.length,
      mouvementsParCategorie,
      topArticles,
      alertesStock: articlesWithAlerts.length,
    };
  }, [selectedMonth, articles, mouvements, articlesWithAlerts]);

  const exportToPDF = () => {
    // Dans une vraie app, générer un PDF avec une librairie comme jsPDF
    const content = `
RAPPORT MENSUEL - ${rapportMensuel.mois.toUpperCase()}

=== RÉSUMÉ ===
• Total entrées: ${rapportMensuel.totalEntrees}
• Total sorties: ${rapportMensuel.totalSorties}
• Articles ajoutés: ${rapportMensuel.articlesAjoutes}
• Alertes stock: ${rapportMensuel.alertesStock}

=== MOUVEMENTS PAR CATÉGORIE ===
${Object.entries(rapportMensuel.mouvementsParCategorie)
  .map(([cat, data]) => `• ${cat}: ${data.entrees} entrées, ${data.sorties} sorties`)
  .join('\n')}

=== TOP ARTICLES ===
${rapportMensuel.topArticles
  .map((article, i) => `${i + 1}. ${article.nom}: ${article.quantite}`)
  .join('\n')}

Généré le ${new Date().toLocaleString('fr-FR')}
    `;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport_${selectedMonth}.txt`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports Mensuels</h1>
          <p className="text-gray-600">Analyse des mouvements et statistiques</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Download size={18} />
            Exporter
          </button>
        </div>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Entrées</p>
              <p className="text-2xl font-bold text-green-600">{rapportMensuel.totalEntrees}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sorties</p>
              <p className="text-2xl font-bold text-orange-600">{rapportMensuel.totalSorties}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Articles ajoutés</p>
              <p className="text-2xl font-bold text-blue-600">{rapportMensuel.articlesAjoutes}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Alertes stock</p>
              <p className="text-2xl font-bold text-red-600">{rapportMensuel.alertesStock}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mouvements par Catégorie */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText size={20} />
            Mouvements par Catégorie
          </h2>
          
          {Object.keys(rapportMensuel.mouvementsParCategorie).length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucun mouvement ce mois-ci</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(rapportMensuel.mouvementsParCategorie)
                .sort(([,a], [,b]) => (b.entrees + b.sorties) - (a.entrees + a.sorties))
                .map(([categorie, data]) => (
                  <div key={categorie} className="border-b border-gray-200 pb-3 last:border-b-0">
                    <h3 className="font-medium text-gray-900 mb-2">{categorie}</h3>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Entrées: {data.entrees}</span>
                      <span className="text-orange-600">Sorties: {data.sorties}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ 
                          width: `${Math.max(10, (data.entrees + data.sorties) / Math.max(...Object.values(rapportMensuel.mouvementsParCategorie).map(d => d.entrees + d.sorties)) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Top Articles */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Top Articles (Mouvements)
          </h2>
          
          {rapportMensuel.topArticles.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucun mouvement ce mois-ci</p>
          ) : (
            <div className="space-y-3">
              {rapportMensuel.topArticles.map((article, index) => (
                <div key={article.nom} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-600 text-white text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900 truncate">{article.nom}</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{article.quantite}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Période sélectionnée */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          Rapport pour {rapportMensuel.mois}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-600 font-medium">Balance:</span>
            <span className={`ml-2 font-semibold ${
              rapportMensuel.totalEntrees >= rapportMensuel.totalSorties ? 'text-green-600' : 'text-red-600'
            }`}>
              {rapportMensuel.totalEntrees - rapportMensuel.totalSorties > 0 ? '+' : ''}
              {rapportMensuel.totalEntrees - rapportMensuel.totalSorties}
            </span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Catégories actives:</span>
            <span className="ml-2 font-semibold">{Object.keys(rapportMensuel.mouvementsParCategorie).length}</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Articles en mouvement:</span>
            <span className="ml-2 font-semibold">{rapportMensuel.topArticles.length}</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Taux d'alerte:</span>
            <span className="ml-2 font-semibold">
              {articles.length > 0 ? Math.round((rapportMensuel.alertesStock / articles.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}