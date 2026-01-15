import { useEffect, useState } from 'react';
import { Article, Mouvement } from '../types';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  BarChart3,
  Euro,
  RefreshCw,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardProps {
  articles: Article[];
  mouvements: Mouvement[];
  articlesWithAlerts: Article[];
  onRefreshData?: () => Promise<void>;
}

const COLORS = ['#2563eb', '#22c55e', '#f59e42', '#ef4444', '#a855f7', '#eab308', '#14b8a6', '#6366f1'];

export function Dashboard({ articles, mouvements, articlesWithAlerts, onRefreshData }: DashboardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [chartData, setChartData] = useState<{ date: string; Entrees: number; Sorties: number }[]>([]);

  // Générer les données du graphique quand les mouvements changent
  useEffect(() => {
    generateChartData();
  }, [mouvements]);

  // Rafraîchissement automatique toutes les 5 minutes (sécurité)
  useEffect(() => {
    const interval = setInterval(() => {
      if (onRefreshData) {
        console.log('🔄 Rafraîchissement automatique (5min)');
        onRefreshData();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [onRefreshData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefreshData) {
      await onRefreshData();
    }
    generateChartData();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Génération des données de graphique
  const generateChartData = () => {
    const days = 14; // 14 derniers jours (2 semaines)
    const data: { date: string; Entrees: number; Sorties: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0); // Reset à minuit
      const label = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      
      const dayMovements = mouvements.filter((m: Mouvement) => {
        const movDate = new Date(m.dateHeure);
        return movDate.getDate() === date.getDate() &&
               movDate.getMonth() === date.getMonth() &&
               movDate.getFullYear() === date.getFullYear();
      });
      
      const entreesCount = dayMovements
        .filter((m: Mouvement) => m.type === 'ENTREE')
        .reduce((sum: number, m: Mouvement) => sum + m.quantite, 0);
      
      const sortiesCount = dayMovements
        .filter((m: Mouvement) => m.type === 'SORTIE')
        .reduce((sum: number, m: Mouvement) => sum + m.quantite, 0);
      
      data.push({ date: label, Entrees: entreesCount, Sorties: sortiesCount });
    }
    
    setChartData(data);
  };

  const recentMouvements = mouvements
    .sort((a, b) => new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime())
    .slice(0, 8);

  const totalArticles = articles.length;
  const totalStock = articles.reduce((sum, article) => sum + (Number(article.quantite_stock) || 0), 0);
  
  const totalValue = articles.reduce((sum, a) => {
    const prix = Number(a.prix_unitaire) || 0;
    const qte = Number(a.quantite_stock) || 0;
    return sum + (prix * qte);
  }, 0);

  const articlesWithPrice = articles.filter(a => Number(a.prix_unitaire) > 0);

  // Fonction helper pour vérifier si une date est aujourd'hui
  const isToday = (date: Date) => {
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.getDate() === today.getDate() &&
           checkDate.getMonth() === today.getMonth() &&
           checkDate.getFullYear() === today.getFullYear();
  };

  const entreesDuJour = mouvements.filter(m => 
    m.type === 'ENTREE' && isToday(m.dateHeure)
  ).reduce((sum, m) => sum + m.quantite, 0);
  
  const sortiesDuJour = mouvements.filter(m => 
    m.type === 'SORTIE' && isToday(m.dateHeure)
  ).reduce((sum, m) => sum + m.quantite, 0);

  const categoriesStats = articles.reduce((acc, article) => {
    acc[article.categorie] = (acc[article.categorie] || 0) + (article.quantite_stock || 0);
    return acc;
  }, {} as Record<string, number>);

  const maxValue = Math.max(...chartData.map(d => Math.max(d.Entrees, d.Sorties)), 1);

  const statsCards = [
    {
      title: "Total Articles",
      value: totalArticles.toString(),
      subtitle: "Références actives",
      icon: Package,
      bgColor: "bg-blue-50 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-200 dark:border-blue-800"
    },
    {
      title: "Stock Total",
      value: totalStock.toString(),
      subtitle: "Unités en stock",
      icon: BarChart3,
      bgColor: "bg-green-50 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      borderColor: "border-green-200 dark:border-green-800"
    },
    {
      title: "Valeur Stock",
      value: totalValue > 0 
        ? totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
        : '0 €',
      subtitle: articlesWithPrice.length > 0 
        ? "Valeur totale" 
        : "Aucun prix défini",
      icon: Euro,
      bgColor: "bg-purple-50 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
      borderColor: "border-purple-200 dark:border-purple-800"
    },
    {
      title: "Alertes Stock",
      value: articlesWithAlerts.length.toString(),
      subtitle: "Articles en alerte",
      icon: AlertTriangle,
      bgColor: "bg-orange-50 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
      borderColor: "border-orange-200 dark:border-orange-800"
    },
  ];

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 md:pb-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header avec bouton refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Tableau de bord
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              Vue d'ensemble complète de votre stock télécoms
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="font-medium">Actualiser</span>
          </button>
        </div>

        {/* Stats Cards principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statsCards.map((card, index) => (
            <div
              key={index}
              className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border ${card.borderColor} p-4 md:p-6 hover:shadow-lg transition-all duration-200`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {card.title}
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {card.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Mouvements du jour */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-green-200 dark:border-green-800 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Entrées aujourd'hui</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{entreesDuJour}</p>
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all" style={{ width: '70%' }} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/30">
                  <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sorties aujourd'hui</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{sortiesDuJour}</p>
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-orange-600 dark:bg-orange-500 h-2 rounded-full transition-all" style={{ width: '50%' }} />
            </div>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Graphique Mouvements 30 jours */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Mouvements (14 jours)</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Entrées et sorties quotidiennes</p>
            </div>
            
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Entrées</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Sorties</span>
              </div>
            </div>

            <div 
              ref={(el) => {
                // Auto-scroll vers la droite (jours les plus récents) sur mobile
                if (el && window.innerWidth < 1024) {
                  el.scrollLeft = el.scrollWidth;
                }
              }}
              className="h-64 flex items-end justify-between gap-1 pb-8 overflow-x-auto lg:overflow-x-visible scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700"
            >
              {chartData.map((data, idx) => {
                const entreesHeight = (data.Entrees / maxValue) * 100;
                const sortiesHeight = (data.Sorties / maxValue) * 100;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 min-w-[30px] lg:min-w-[20px] max-w-[50px]">
                    <div className="w-full flex flex-col-reverse items-center gap-1 flex-1">
                      <div 
                        className="w-full bg-green-500 dark:bg-green-400 rounded-t transition-all hover:bg-green-600 relative group"
                        style={{ height: `${entreesHeight}%`, minHeight: data.Entrees > 0 ? '4px' : '0' }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-lg">
                          {data.Entrees}
                        </span>
                      </div>
                      <div 
                        className="w-full bg-red-500 dark:bg-red-400 rounded-t transition-all hover:bg-red-600 relative group"
                        style={{ height: `${sortiesHeight}%`, minHeight: data.Sorties > 0 ? '4px' : '0' }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-lg">
                          {data.Sorties}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 rotate-45 origin-top-left whitespace-nowrap mt-2">
                      {data.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stock par Catégorie */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Stock par catégorie</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Répartition des stocks</p>
            </div>

            <div className="space-y-4">
              {Object.entries(categoriesStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([categorie, quantite], idx) => {
                  const maxQuantite = Math.max(...Object.values(categoriesStats));
                  const percentage = (quantite / maxQuantite) * 100;
                  const color = COLORS[idx % COLORS.length];
                  
                  return (
                    <div key={categorie}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{categorie}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2">
                          {quantite}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Alertes et Mouvements récents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Alertes Stock */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 overflow-hidden">
            <div className="px-6 py-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Alertes Stock ({articlesWithAlerts.length})
                </h2>
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {articlesWithAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Package className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Aucune alerte stock</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Tous les articles sont au-dessus du seuil</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {articlesWithAlerts.slice(0, 8).map(article => (
                    <div
                      key={article.id}
                      className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${
                          article.quantite_stock === 0 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-orange-600 dark:text-orange-400'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {article.nom}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {article.categorie}
                          </p>
                        </div>
                      </div>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                        article.quantite_stock === 0
                          ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                          : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                      }`}>
                        {article.quantite_stock} / {article.seuil_minimum}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Derniers Mouvements */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Derniers Mouvements
                </h2>
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {recentMouvements.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Aucun mouvement</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Les mouvements apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentMouvements.map((mouvement) => {
                    const article = mouvement.article;
                    
                    return (
                      <div
                        key={mouvement.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                            mouvement.type === 'ENTREE'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                          }`}>
                            {mouvement.type === 'ENTREE' ? '↑' : '↓'} {mouvement.quantite}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {article?.nom || 'Article supprimé'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {format(new Date(mouvement.dateHeure), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}