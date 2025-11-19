import { useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import 'highcharts/highcharts-3d';
import HighchartsReact from 'highcharts-react-official';
// Modern Area Chart style (shadcn/ui inspired)
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Activity,
  RefreshCw,
  Radius,
} from 'lucide-react';


import { Article, Mouvement, Inventaire } from '../types';
import { deprecate } from 'util';



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

const COLORS = ['#2563eb', '#22c55e', '#f59e42', '#ef4444', '#a855f7', '#eab308', '#14b8a6', '#6366f1'];

export function AdminDashboard({
  articles,
  mouvements,
  inventaires,
  onNavigate
}: AdminDashboardProps) {
  // HOOKS
  const [timeframe] = useState<'day' | 'week' | 'month' | 'year'>('week');
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
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  // Détection du mode dark (body.classList ou media query)
  const isDark = typeof window !== 'undefined' && (document.body.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches);


  // Options Highcharts pour AreaChart (Entrées/Sorties)
  const areaChartOptions = {
    chart: {
      type: 'area',
      height: 350,
      backgroundColor: isDark ? '#1f2937' : 'transparent',
    },
    title: { text: undefined },
    xAxis: {
      categories: chartData.map(d => d.date),
      tickmarkPlacement: 'on',
      title: { enabled: false },
      gridLineWidth: 0,
      labels: { style: { color: isDark ? '#d1d5db' : '#374151' } },
      lineColor: isDark ? '#374151' : '#e5e7eb',
    },
    yAxis: {
      title: { text: 'Quantité', style: { color: isDark ? '#d1d5db' : '#374151' } },
      min: 0,
      gridLineWidth: 1,
      gridLineColor: isDark ? '#374151' : '#e5e7eb',
      labels: { style: { color: isDark ? '#d1d5db' : '#374151' } },
    },
    tooltip: {
      shared: true,
      valueSuffix: ' unités',
      backgroundColor: isDark ? '#111827' : '#fff',
      style: { color: isDark ? '#f3f4f6' : '#111827' },
    },
    legend: {
      enabled: true,
      itemStyle: { color: isDark ? '#d1d5db' : '#374151' },
      itemHoverStyle: { color: isDark ? '#fff' : '#111827' },
    },
    plotOptions: {
      area: {
        marker: { enabled: false }
      }
    },
    series: [
      {
        name: 'Entrées',
        data: chartData.map(d => d.Entrees),
        color: '#22c55e',
        fillOpacity: 0.3,
      },
      {
        name: 'Sorties',
        data: chartData.map(d => d.Sorties),
        color: '#ef4444',
        fillOpacity: 0.3,
      },
    ],
    credits: { enabled: false },
  };

  // Options Highcharts pour PieChart (Taux de rotation)
  const pieChartOptions = {
    chart: {
      type: 'pie',
      height: 350,
      backgroundColor: isDark ? '#1f2937' : 'transparent',
      options3d: {
        enabled: true,
        alpha: 30,
        beta: 0,
      }
    },
    title: { text: undefined },
    tooltip: {
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>',
      backgroundColor: isDark ? '#111827' : '#fff',
      style: { color: isDark ? '#f3f4f6' : '#111827' },
    },
    accessibility: { point: { valueSuffix: '%' } },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        depth: 35,
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.percentage:.1f} %',
          style: { color: isDark ? '#f3f4f6' : '#111827' }
        }
      }
    },
    legend: {
      itemStyle: { color: isDark ? '#d1d5db' : '#374151' },
      itemHoverStyle: { color: isDark ? '#fff' : '#111827' },
    },
    series: [{
      type: 'pie',
      name: 'Rotation',
      colorByPoint: true,
      data: pieData.map((d, idx) => ({
        name: d.name,
        y: d.value,
        color: COLORS[idx % COLORS.length]
      }))
    }],
    credits: { enabled: false },
  };


  // Calcul des stats du dashboard
  const calculateStats = () => {
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
      return d.toDateString() === today.toDateString();
    }).length;
    const activeInventories = inventaires.filter(inv => inv.statut === 'EN_COURS').length;
    const criticalAlerts = articles.filter(article =>
      article.quantite_stock === 0 ||
      article.quantite_stock < Math.max(1, (article.seuil_minimum || 0) * 0.5)
    ).length;
    setStats(s => ({
      ...s,
      totalArticles,
      totalValue,
      lowStockCount,
      todayMovements,
      activeInventories,
      criticalAlerts
    }));
  };

  // Génération des alertes critiques
  const generateAlerts = () => {
    const newAlerts: StockAlert[] = articles.filter(a => a.quantite_stock !== undefined && a.quantite_stock <= (a.seuil_minimum || 0)).map(a => ({
      id: a.id,
      type: a.quantite_stock === 0 ? 'no_stock' : 'low_stock',
      article: a,
      severity: a.quantite_stock === 0 ? 'high' : 'medium',
      message: a.quantite_stock === 0 ? 'Rupture de stock' : 'Stock faible',
      date: new Date()
    }));
    setAlerts(newAlerts.slice(0, 10));
  };

  // Pie chart: répartition du stock par catégorie
  const generatePieData = () => {
    const catStats: Record<string, number> = {};
    articles.forEach((a: Article) => {
      catStats[a.categorie] = (catStats[a.categorie] || 0) + (a.quantite_stock || 0);
    });
    setPieData(Object.entries(catStats).map(([name, value]) => ({ name, value })));
  };

  // Area chart: mouvements sur 30 jours
  const generateChartData = () => {
    const days = 30;
    const data: any[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const label = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayMovements = mouvements.filter((m: Mouvement) => {
        const movDate = new Date(m.dateHeure);
        return movDate >= dayStart && movDate < dayEnd;
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
  };

  // EFFECTS
  useEffect(() => {
    calculateStats();
    generateAlerts();
    generateChartData();
    generatePieData();
  }, [articles, mouvements, inventaires, timeframe]);

  // HANDLERS
  const handleRefresh = async () => {
    setRefreshing(true);
    // Simuler un refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    calculateStats();
    generateAlerts();
    generateChartData();
    generatePieData();
    setRefreshing(false);
  };

  // exportData supprimé car inutilisé

  // RENDER
  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-900 overflow-y-auto overflow-x-hidden w-full">
      {/* VU D'ENSEMBLE */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vue d'ensemble</h2>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
          disabled={refreshing}
        >
          <RefreshCw className={refreshing ? 'animate-spin' : ''} size={18} />
          {refreshing ? 'Rafraîchissement...' : 'Rafraîchir'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col items-start">
          <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400"><Package size={20} /> Articles</div>
          <div className="text-2xl font-bold">{stats.totalArticles}</div>
          <div className="text-xs text-gray-500">Total articles référencés</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col items-start">
          <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400"><TrendingUp size={20} /> Valeur stock</div>
          <div className="text-2xl font-bold">{stats.totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
          <div className="text-xs text-gray-500">Valeur financière totale</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col items-start">
          <div className="flex items-center gap-2 mb-2 text-yellow-600 dark:text-yellow-400"><AlertTriangle size={20} /> Stock faible</div>
          <div className="text-2xl font-bold">{stats.lowStockCount}</div>
          <div className="text-xs text-gray-500">Articles sous le seuil</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col items-start">
          <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400"><Activity size={20} /> Mouvements aujourd'hui</div>
          <div className="text-2xl font-bold">{stats.todayMovements}</div>
          <div className="text-xs text-gray-500">Entrées/sorties du jour</div>
        </div>
      </div>

      {/* GRAPHIQUES ET ANALYSES */}
      {/* Affichage des graphiques uniquement sur desktop/tablette */}
      <div className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Highcharts Area Chart - Mouvements du mois */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Mouvements en cours</h3>
              <p className="text-xs text-gray-500">Entrées et sorties par jour</p>
            </div>
          </div>
          <HighchartsReact
            containerProps={{ style: { margin: '0 auto' } }}
            highcharts={Highcharts}
            options={areaChartOptions}
          />
        </div>

        {/* Highcharts Pie Chart - Taux de rotation des produits */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Taux de rotation des produits</h3>
              <p className="text-xs text-gray-500">Répartition des mouvements par catégorie</p>
            </div>
          </div>
          <HighchartsReact
            highcharts={Highcharts}
            options={pieChartOptions}
          />
        </div>
      </div>
    </div>
  );
}

