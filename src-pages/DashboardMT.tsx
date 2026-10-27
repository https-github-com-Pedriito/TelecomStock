'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Article, Mouvement } from '@/types';
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
  const [selectedAlertArticle, setSelectedAlertArticle] = useState<Article | null>(null);

  // Génération des données de graphique — dérivé synchrone de `mouvements`, pas besoin d'effect
  const chartData = useMemo(() => {
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

    return data;
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
    setTimeout(() => setRefreshing(false), 500);
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

  // Calculer le pourcentage pour les barres de progression d'aujourd'hui
  const maxDailyMovement = Math.max(entreesDuJour, sortiesDuJour, 1);
  const entreesPercentage = (entreesDuJour / maxDailyMovement) * 100;
  const sortiesPercentage = (sortiesDuJour / maxDailyMovement) * 100;

  const statsCards = [
    {
      title: "Références",
      value: totalArticles.toString(),
      subtitle: "Références actives",
      icon: Package,
      bgColor: "bg-blue-50 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-200 dark:border-blue-800"
    },
    {
      title: "Unités totales",
      value: totalStock.toString(),
      subtitle: "Equipements disponibles",
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
      subtitle: "Seuils critiques atteints",
      icon: AlertTriangle,
      bgColor: "bg-orange-50 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
      borderColor: "border-orange-200 dark:border-orange-800"
    },
  ];

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 md:pb-8 overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-700">
        {/* Pull-to-refresh indicator (Simulation) */}
        <div className={`overflow-hidden transition-all duration-300 flex justify-center items-center ${refreshing ? 'h-16 opacity-100' : 'h-0 opacity-0'}`}>
          <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 font-medium">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-sm">Mise à jour du dashboard...</span>
          </div>
        </div>

        {/* Header avec bouton refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="transform transition-all active:scale-[0.98]">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Tableau de bord
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              Vue d'ensemble complète de votre stock
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <RefreshCw className={`w-5 h-5 group-hover:rotate-180 transition-transform duration-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="font-semibold">Actualiser</span>
          </button>
        </div>

        {/* Stats Cards principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {statsCards.map((card, index) => (
            <div
              key={index}
              className="rounded-2xl hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group cursor-default"
            >
              <div className="glass rounded-2xl p-4 md:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${card.bgColor} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                    <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs md:text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    {card.title}
                  </p>
                  <p className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {card.value}
                  </p>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                    {card.subtitle}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mouvements du jour */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="rounded-2xl hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 shadow-sm">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Entrées aujourd'hui</p>
                  <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{entreesDuJour}</p>
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden p-[2px]">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-1000 shadow-sm"
                style={{ width: `${entreesPercentage}%` }}
              />
            </div>
          </div>
          </div>

          <div className="rounded-2xl hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 shadow-sm">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Sorties aujourd'hui</p>
                  <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{sortiesDuJour}</p>
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden p-[2px]">
              <div
                className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-1000 shadow-sm"
                style={{ width: `${sortiesPercentage}%` }}
              />
            </div>
          </div>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
          {/* Graphique Mouvements 14 jours */}
          <div className="glass rounded-2xl p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm">
                    <Activity size={20} />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Flux de stock</h3>
                </div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Activité des 14 derniers jours</p>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">ENTRÉES</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></div>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">SORTIES</span>
                </div>
              </div>
            </div>

            <div
              ref={(el) => {
                if (el && window.innerWidth < 1024) el.scrollLeft = el.scrollWidth;
              }}
              className="h-72 flex items-end justify-between gap-1 pb-10 overflow-x-auto no-scrollbar"
            >
              {chartData.map((data, idx) => {
                const entreesHeight = (data.Entrees / maxValue) * 100;
                const sortiesHeight = (data.Sorties / maxValue) * 100;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 min-w-[32px] max-w-[40px] group/item">
                    <div className="w-full flex items-end justify-center h-full gap-1">
                      <div
                        className="w-2.5 bg-green-500/90 dark:bg-green-400 shadow-lg shadow-green-500/20 rounded-t-full transition-all duration-300 group-hover/item:bg-green-600 relative group/tooltip"
                        style={{ height: `${Math.max(entreesHeight, 2)}%` }}
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 pointer-events-none scale-90 group-hover/tooltip:scale-100 z-10">
                          <div className="bg-gray-900 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-white/10">
                            {data.Entrees} entrées
                          </div>
                          <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1 border-r border-b border-white/10"></div>
                        </div>
                      </div>
                      <div
                        className="w-2.5 bg-red-500/90 dark:bg-red-400 shadow-lg shadow-red-500/20 rounded-t-full transition-all duration-300 group-hover/item:bg-red-600 relative group/tooltip"
                        style={{ height: `${Math.max(sortiesHeight, 2)}%` }}
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 pointer-events-none scale-90 group-hover/tooltip:scale-100 z-10">
                          <div className="bg-gray-900 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-white/10">
                            {data.Sorties} sorties
                          </div>
                          <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1 border-r border-b border-white/10"></div>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 -rotate-45 mt-1">
                      {data.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stock par Catégorie */}
          <div className="glass rounded-2xl p-6 lg:p-8">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-sm">
                  <BarChart3 size={20} />
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Répartition par catégorie</h3>
              </div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Volume de stock par famille</p>
            </div>

            <div className="space-y-5">
              {Object.entries(categoriesStats)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([categorie, quantite], idx) => {
                  const maxQuantite = Math.max(...Object.values(categoriesStats));
                  const percentage = (quantite / maxQuantite) * 100;
                  const color = COLORS[idx % COLORS.length];

                  return (
                    <div key={categorie} className="group cursor-default">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }}></div>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide truncate max-w-[150px]">{categorie}</span>
                        </div>
                        <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                          {quantite}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800/50 rounded-full h-2.5 overflow-hidden p-[1px]">
                        <div
                          className="h-full rounded-full transition-all duration-1000 shadow-sm"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
          {/* Alertes Stock */}
          <div className="glass rounded-2xl overflow-hidden border-orange-500/20">
            <div className="px-6 py-5 bg-orange-500/5 border-b border-orange-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    Alertes Critiques
                  </h2>
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                    {articlesWithAlerts.length} équipements à réapprovisionner
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto no-scrollbar">
              {articlesWithAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                    <Package className="w-10 h-10 text-green-500" />
                  </div>
                  <p className="text-gray-900 dark:text-white font-bold">Stock optimal</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Aucune alerte critique à signaler.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {articlesWithAlerts.slice(0, 10).map(article => (
                    <div
                      key={article.id}
                      onClick={() => setSelectedAlertArticle(article)}
                      className="group flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 rounded-2xl hover:border-orange-500/50 hover:bg-orange-500/5 transition-all duration-300 cursor-pointer shadow-sm active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={`w-2 h-10 rounded-full ${article.quantite_stock === 0 ? 'bg-red-500' : 'bg-orange-500'} shadow-sm`}></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-bold text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            {article.nom}
                          </p>
                          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            {article.categorie}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-lg font-black ${article.quantite_stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                          {article.quantite_stock}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">sur {article.seuil_minimum}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Derniers Mouvements */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-5 bg-blue-500/5 border-b border-blue-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    Flux récents
                  </h2>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Dernières activités logistiques
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto no-scrollbar">
              {recentMouvements.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                    <Clock className="w-10 h-10 text-blue-500" />
                  </div>
                  <p className="text-gray-900 dark:text-white font-bold">Aucun flux</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Les mouvements de stock apparaîtront ici.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMouvements.map((mouvement) => (
                    <div
                      key={mouvement.id}
                      className="group flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 rounded-2xl hover:border-blue-500/30 hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 shadow-sm"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={`p-2 rounded-xl ${mouvement.type === 'ENTREE' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'} transition-transform group-hover:scale-110`}>
                          {mouvement.type === 'ENTREE' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-bold text-gray-900 dark:text-white truncate">
                            {mouvement.article?.nom || 'Équipement supprimé'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock size={12} className="text-gray-400" />
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                              {format(new Date(mouvement.dateHeure), 'dd MMM HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-lg font-black ${mouvement.type === 'ENTREE' ? 'text-green-600' : 'text-orange-600'}`}>
                          {mouvement.type === 'ENTREE' ? '+' : '-'}{mouvement.quantite}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{mouvement.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modale d'article pour les alertes */}
      {selectedAlertArticle && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-md flex items-center justify-center z-[9999] p-2 sm:p-4 animate-in fade-in duration-300">
          <div className="rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl max-w-md w-full max-h-[85vh] animate-in zoom-in-95 duration-300">
          <div className="glass rounded-[2rem] sm:rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 px-4 py-3 sm:px-6 sm:py-4 border-b border-white/20 dark:border-gray-800/50 bg-blue-500/10 dark:bg-blue-950/30 backdrop-blur-md flex items-center justify-between rounded-t-[2rem] sm:rounded-t-[2.5rem]">
              <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">Équipement en alerte</h2>
              <button
                onClick={() => setSelectedAlertArticle(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenu */}
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {/* Image */}
              {selectedAlertArticle.image_url && (
                <div className="relative w-full h-32 sm:h-48 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                  <Image
                    src={selectedAlertArticle.image_url}
                    alt={selectedAlertArticle.nom}
                    fill
                    sizes="(max-width: 640px) 100vw, 448px"
                    className="object-cover"
                  />
                </div>
              )}

              {/* Nom et Référence */}
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 leading-tight">
                  {selectedAlertArticle.nom}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Réf: {selectedAlertArticle.code_barres || selectedAlertArticle.id.slice(0, 8)}
                </p>
              </div>

              {/* Catégorie et Localisation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">Catégorie</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{selectedAlertArticle.categorie}</p>
                </div>
                <div className="p-2.5 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">Localisation</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{selectedAlertArticle.localisation}</p>
                </div>
              </div>

              {/* Stock */}
              <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-2">État du stock</p>
                <div className="flex items-baseline gap-2 mb-2 sm:mb-3">
                  <span className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
                    {selectedAlertArticle.quantite_stock}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    / {selectedAlertArticle.seuil_minimum} (min)
                  </span>
                </div>
                {selectedAlertArticle.quantite_stock === 0 && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs sm:text-sm font-semibold">
                    <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                    Rupture de stock
                  </div>
                )}
                {selectedAlertArticle.quantite_stock < selectedAlertArticle.seuil_minimum && selectedAlertArticle.quantite_stock > 0 && (
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs sm:text-sm font-semibold">
                    <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                    Stock faible
                  </div>
                )}
              </div>

              {/* Prix */}
              {selectedAlertArticle.prix_unitaire && (
                <div className="p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">Prix unitaire</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {Number(selectedAlertArticle.prix_unitaire).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
              )}

              {/* Fournisseur */}
              {selectedAlertArticle.fournisseur && (
                <div className="p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">Fournisseur</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{selectedAlertArticle.fournisseur}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-4 py-3 sm:px-6 sm:py-4 border-t border-white/20 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-b-[2rem] sm:rounded-b-[2.5rem]">
              <button
                onClick={() => setSelectedAlertArticle(null)}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-sm sm:text-base"
              >
                Fermer
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}