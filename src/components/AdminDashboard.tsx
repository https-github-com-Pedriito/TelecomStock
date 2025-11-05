import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Activity,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Bell,
  Eye,
  Settings
} from 'lucide-react';
import { Article, Mouvement, Inventaire } from '../types';

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

interface ChartData {
  labels: string[];
  entrees: number[];
  sorties: number[];
  stock: number[];
}

export function AdminDashboard({ 
  articles, 
  mouvements, 
  inventaires, 
  onNavigate 
}: AdminDashboardProps) {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('week');
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
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    entrees: [],
    sorties: [],
    stock: []
  });

  // Calcul des statistiques
  useEffect(() => {
    calculateStats();
    generateAlerts();
    generateChartData();
  }, [articles, mouvements, inventaires, timeframe]);

  const calculateStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Articles total et valeur financière
    const totalArticles = articles.length;
    const totalValue = articles.reduce((sum, article) => {
      const prix = article.prix_unitaire || 0;
      return sum + (article.quantite_stock * prix);
    }, 0);

    // Stock faible (utilise seuil_minimum)
    const lowStockCount = articles.filter(article => 
      article.quantite_stock <= article.seuil_minimum
    ).length;

    // Mouvements du jour
    const todayMovements = mouvements.filter(mouvement => {
      const movDate = new Date(mouvement.dateHeure);
      return movDate >= today;
    }).length;

    // Tendances
    const weekMovements = mouvements.filter(m => new Date(m.dateHeure) >= weekAgo);
    const monthMovements = mouvements.filter(m => new Date(m.dateHeure) >= monthAgo);
    
    const weeklyTrend = weekMovements.length;
    const monthlyTrend = monthMovements.length;

    // Inventaires actifs
    const activeInventories = inventaires.filter(inv => 
      inv.statut === 'EN_COURS'
    ).length;

    // Alertes critiques
    const criticalAlerts = articles.filter(article => 
      article.quantite_stock === 0 || 
      article.quantite_stock < Math.max(1, article.seuil_minimum * 0.5)
    ).length;

    setStats({
      totalArticles,
      totalValue,
      lowStockCount,
      todayMovements,
      weeklyTrend,
      monthlyTrend,
      activeInventories,
      criticalAlerts
    });
  };

  const generateAlerts = () => {
    const newAlerts: StockAlert[] = [];

    articles.forEach(article => {
      const seuil = article.seuil_minimum;
      
      if (article.quantite_stock === 0) {
        newAlerts.push({
          id: `no-stock-${article.id}`,
          type: 'no_stock',
          article,
          severity: 'high',
          message: `Stock épuisé`,
          date: new Date()
        });
      } else if (article.quantite_stock < seuil * 0.5) {
        newAlerts.push({
          id: `critical-${article.id}`,
          type: 'low_stock',
          article,
          severity: 'high',
          message: `Stock critique (${article.quantite_stock} restant)`,
          date: new Date()
        });
      } else if (article.quantite_stock < seuil) {
        newAlerts.push({
          id: `low-${article.id}`,
          type: 'low_stock',
          article,
          severity: 'medium',
          message: `Stock faible (${article.quantite_stock} restant)`,
          date: new Date()
        });
      }
    });

    setAlerts(newAlerts.slice(0, 10)); // Limiter à 10 alertes
  };

  const generateChartData = () => {
    const days = 7;
    const labels: string[] = [];
    const entrees: number[] = [];
    const sorties: number[] = [];
    const stock: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('fr-FR', { weekday: 'short' }));

      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayMovements = mouvements.filter(m => {
        const movDate = new Date(m.dateHeure);
        return movDate >= dayStart && movDate < dayEnd;
      });

      const entreesCount = dayMovements
        .filter(m => m.type === 'ENTREE')
        .reduce((sum, m) => sum + m.quantite, 0);
      
      const sortiesCount = dayMovements
        .filter(m => m.type === 'SORTIE')
        .reduce((sum, m) => sum + m.quantite, 0);

      const stockValue = articles.reduce((sum, article) => 
        sum + article.quantite_stock, 0
      );

      entrees.push(entreesCount);
      sorties.push(sortiesCount);
      stock.push(stockValue);
    }

    setChartData({ labels, entrees, sorties, stock });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simuler un refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    calculateStats();
    generateAlerts();
    generateChartData();
    setRefreshing(false);
  };

  const exportData = () => {
    const data = {
      stats,
      alerts: alerts.slice(0, 5),
      chartData,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 overflow-y-auto overflow-x-hidden w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Administrateur
          </h1>
          <p className="text-gray-600 mt-1">
            Vue d'ensemble et contrôle du système
          </p>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          <button
            onClick={() => onNavigate?.('alerts')}
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="h-5 w-5" />
            {stats.criticalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {stats.criticalAlerts}
              </span>
            )}
          </button>
          
          <button
            onClick={() => onNavigate?.('settings')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
          
          <button
            onClick={exportData}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter</span>
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Période:</span>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="day">Aujourd'hui</option>
            <option value="week">7 derniers jours</option>
            <option value="month">30 derniers jours</option>
            <option value="year">Cette année</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
          </span>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8 w-full">
        {/* Total Articles */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Articles</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalArticles}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+{stats.todayMovements} mouvements aujourd'hui</span>
          </div>
        </div>

        {/* Valeur Stock */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valeur Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalValue.toLocaleString('fr-FR')}€
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+{stats.monthlyTrend} ce mois</span>
          </div>
        </div>

        {/* Alertes Stock */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Alertes Stock</p>
              <p className="text-2xl font-bold text-gray-900">{stats.lowStockCount}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className={`text-sm ${stats.criticalAlerts > 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {stats.criticalAlerts} critiques
            </span>
          </div>
        </div>

        {/* Inventaires Actifs */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inventaires</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeInventories}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-600">en cours</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 w-full">
        {/* Graphique des mouvements */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Mouvements de Stock
            </h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <span>Entrées</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                <span>Sorties</span>
              </div>
            </div>
          </div>
          
          {/* Graphique simple avec barres CSS */}
          <div className="space-y-3">
            {chartData.labels.map((label, index) => (
              <div key={label} className="flex items-center space-x-3">
                <div className="w-12 text-xs text-gray-600">{label}</div>
                <div className="flex-1 flex items-center space-x-1">
                  <div className="flex items-end space-x-1 h-8 flex-1">
                    <div 
                      className="bg-green-500 min-w-[2px] rounded-t"
                      style={{ 
                        height: `${Math.max(4, (chartData.entrees[index] / Math.max(...chartData.entrees, 1)) * 100)}%`,
                        width: '12px'
                      }}
                    />
                    <div 
                      className="bg-red-500 min-w-[2px] rounded-t"
                      style={{ 
                        height: `${Math.max(4, (chartData.sorties[index] / Math.max(...chartData.sorties, 1)) * 100)}%`,
                        width: '12px'
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 w-16 text-right">
                    +{chartData.entrees[index]} -{chartData.sorties[index]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertes */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Alertes Récentes
            </h3>
            <button
              onClick={() => onNavigate?.('alerts')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              <Eye className="h-4 w-4 mr-1" />
              Voir tout
            </button>
          </div>
          
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Aucune alerte active</p>
              </div>
            ) : (
              alerts.slice(0, 5).map(alert => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'high' ? 'bg-red-50 border-red-500' :
                    alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {alert.article.nom}
                      </p>
                      <p className={`text-sm ${
                        alert.severity === 'high' ? 'text-red-700' :
                        alert.severity === 'medium' ? 'text-yellow-700' :
                        'text-blue-700'
                      }`}>
                        {alert.message}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity === 'high' ? 'Critique' :
                       alert.severity === 'medium' ? 'Moyen' : 'Info'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Articles les plus actifs */}
      <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Articles les Plus Actifs
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Article</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Stock</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Mouvements</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Valeur</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Statut</th>
              </tr>
            </thead>
            <tbody>
              {articles
                .sort((a, b) => {
                  const aMovements = mouvements.filter(m => m.article.id === a.id).length;
                  const bMovements = mouvements.filter(m => m.article.id === b.id).length;
                  return bMovements - aMovements;
                })
                .slice(0, 8)
                .map(article => {
                  const articleMovements = mouvements.filter(m => m.article.id === article.id).length;
                  const value = article.quantite_stock;
                  const isLowStock = article.quantite_stock <= article.seuil_minimum;
                  const isOutOfStock = article.quantite_stock === 0;
                  
                  return (
                    <tr key={article.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{article.nom}</p>
                          <p className="text-gray-500 text-xs">{article.code_barres}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-900">{article.quantite_stock}</td>
                      <td className="py-3 px-4 text-gray-900">{articleMovements}</td>
                      <td className="py-3 px-4 text-gray-900">{value.toFixed(2)}€</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isOutOfStock ? 'bg-red-100 text-red-800' :
                          isLowStock ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {isOutOfStock ? 'Épuisé' :
                           isLowStock ? 'Stock faible' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}