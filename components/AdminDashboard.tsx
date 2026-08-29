'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Activity,
  RefreshCw
} from 'lucide-react';

import { Article, Mouvement, Inventaire } from '@/types';

interface AdminDashboardProps {
  articles: Article[];
  mouvements: Mouvement[];
  inventaires: Inventaire[];
  onNavigate?: (view: string) => void;
}

interface DashboardStats {
  totalArticles: number;
  totalValue: number;
  lowStockCount: number;
  todayMovements: number;
  weeklyTrend: number;
  monthlyTrend: number;
  activeInventories: number;
  criticalAlerts: number;
}

interface StockAlert {
  id: string;
  type: 'low_stock' | 'no_stock' | 'overstock' | 'expired';
  article: Article;
  severity: 'high' | 'medium' | 'low';
  message: string;
  date: Date;
}

interface ChartDataPoint {
  date: string;
  Entrees: number;
  Sorties: number;
}

interface PieDataPoint {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#2563eb', '#22c55e', '#f59e42', '#ef4444', '#a855f7', '#eab308', '#14b8a6', '#6366f1'];

export function AdminDashboard({
  articles,
  mouvements,
  inventaires
}: AdminDashboardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    totalValue: 0,
    lowStockCount: 0,
    todayMovements: 0,
    weeklyTrend: 0,
    monthlyTrend: 0,
    activeInventories: 0,
    criticalAlerts: 0
  });
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [pieData, setPieData] = useState<PieDataPoint[]>([]);

  // Calcul des stats du dashboard
  const calculateStats = useCallback(() => {
    const totalArticles = articles.length;
    const totalValue = articles.reduce((sum, a) => {
      const prix = typeof a.prix_unitaire === 'number' ? a.prix_unitaire : 0;
      const qte = typeof a.quantite_stock === 'number' ? a.quantite_stock : 0;
      return sum + prix * qte;
    }, 0);
    const lowStockCount = articles.filter(a => a.quantite_stock !== undefined && a.quantite_stock <= (a.seuil_minimum || 0)).length;
    const today = new Date();
    const todayMovements = mouvements.filter(m => {
      const d = new Date(m.dateHeure);
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    }).length;
    const activeInventories = inventaires.filter(inv => inv.statut === 'EN_COURS').length;
    const criticalAlerts = articles.filter(article =>
      article.quantite_stock === 0 ||
      article.quantite_stock < Math.max(1, (article.seuil_minimum || 0) * 0.5)
    ).length;
    setStats({
      totalArticles,
      totalValue,
      lowStockCount,
      todayMovements,
      weeklyTrend: 0,
      monthlyTrend: 0,
      activeInventories,
      criticalAlerts
    });
  }, [articles, mouvements, inventaires]);

  // Génération des alertes critiques
  const generateAlerts = useCallback(() => {
    const newAlerts: StockAlert[] = articles
      .filter(a => a.quantite_stock !== undefined && a.quantite_stock <= (a.seuil_minimum || 0))
      .map(a => ({
        id: a.id,
        type: a.quantite_stock === 0 ? 'no_stock' as const : 'low_stock' as const,
        article: a,
        severity: a.quantite_stock === 0 ? 'high' as const : 'medium' as const,
        message: a.quantite_stock === 0 ? 'Rupture de stock' : 'Stock faible',
        date: new Date()
      }));
    setAlerts(newAlerts.slice(0, 10));
  }, [articles]);

  // Pie chart: répartition du stock par catégorie
  const generatePieData = useCallback(() => {
    const catStats: Record<string, number> = {};
    articles.forEach((a: Article) => {
      catStats[a.categorie] = (catStats[a.categorie] || 0) + (a.quantite_stock || 0);
    });
    const data = Object.entries(catStats).map(([name, value], idx) => ({
      name,
      value,
      color: COLORS[idx % COLORS.length]
    }));
    setPieData(data);
  }, [articles]);

  // Area chart: mouvements sur 30 jours
  const generateChartData = useCallback(() => {
    const days = 30;
    const data: ChartDataPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
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
      data.push({
        date: label,
        Entrees: entreesCount,
        Sorties: sortiesCount
      });
    }
    setChartData(data);
  }, [mouvements]);

  useEffect(() => {
    calculateStats();
    generateAlerts();
    generateChartData();
    generatePieData();
  }, [calculateStats, generateAlerts, generateChartData, generatePieData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    calculateStats();
    generateAlerts();
    generateChartData();
    generatePieData();
    setRefreshing(false);
  };

  // Calcul des valeurs max pour les graphiques
  const maxValue = Math.max(...chartData.map(d => Math.max(d.Entrees, d.Sorties)), 1);
  const totalPieValue = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-900 overflow-y-auto overflow-x-hidden w-full min-h-screen pb-20 md:pb-8">
      {/* HEADER */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vue d'ensemble</h2>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
          disabled={refreshing}
        >
          <RefreshCw className={refreshing ? 'animate-spin' : ''} size={18} />
          {refreshing ? 'Rafraîchissement...' : 'Rafraîchir'}
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
            <Package size={20} />
            <span className="text-sm font-medium">Articles</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalArticles}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total articles référencés</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400">
            <TrendingUp size={20} />
            <span className="text-sm font-medium">Valeur stock</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Valeur financière totale</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle size={20} />
            <span className="text-sm font-medium">Stock faible</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lowStockCount}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Articles sous le seuil</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
            <Activity size={20} />
            <span className="text-sm font-medium">Mouvements</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.todayMovements}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Entrées/sorties du jour</div>
        </div>
      </div>

      {/* GRAPHIQUES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Graphique en barres - Mouvements */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Mouvements des 30 derniers jours</h3>
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

          <div className="h-64 flex items-end justify-between gap-1 overflow-x-auto pb-8">
            {chartData.slice(-15).map((data, idx) => {
              const entreesHeight = (data.Entrees / maxValue) * 100;
              const sortiesHeight = (data.Sorties / maxValue) * 100;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 min-w-[20px]">
                  <div className="w-full flex flex-col-reverse items-center gap-1 flex-1">
                    <div 
                      className="w-full bg-green-500 dark:bg-green-400 rounded-t transition-all hover:bg-green-600 relative group"
                      style={{ height: `${entreesHeight}%` }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {data.Entrees}
                      </span>
                    </div>
                    <div 
                      className="w-full bg-red-500 dark:bg-red-400 rounded-t transition-all hover:bg-red-600 relative group"
                      style={{ height: `${sortiesHeight}%` }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity">
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

        {/* Graphique en barres horizontales - Stock par catégorie */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Stock par catégorie</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Répartition des stocks</p>
          </div>

          <div className="space-y-4">
            {pieData.slice(0, 8).map((data, idx) => {
              const percentage = totalPieValue > 0 ? (data.value / totalPieValue) * 100 : 0;
              
              return (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{data.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {data.value} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: data.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ALERTES */}
      {alerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-orange-500" size={20} />
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Alertes de stock</h3>
          </div>
          
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  alert.severity === 'high'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle
                    size={18}
                    className={alert.severity === 'high' ? 'text-red-600' : 'text-orange-600'}
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{alert.article.nom}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {alert.message} - Stock: {alert.article.quantite_stock}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    alert.severity === 'high'
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                  }`}
                >
                  {alert.severity === 'high' ? 'Critique' : 'Attention'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
