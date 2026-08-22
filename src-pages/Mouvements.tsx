'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Mouvement } from '@/types';
import { api } from '@/lib/api';
import {
  Search,
  Filter,
  Download,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Package,
  User,
  History,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Activity,
  Flame,
  ShieldCheck,
  Clock,
  Zap,
  Loader2
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, getHours } from 'date-fns';
import { fr } from 'date-fns/locale';

type TimeRange = 'all' | 'today' | '7days' | '30days' | '1month' | '3months' | '6months';

// Nombre de mouvements chargés par requête serveur. Les plages bornées (7j/30j/3m/6m)
// tiennent dans un seul chargement ; "Tout" charge par paliers via "Charger plus".
const FETCH_LIMIT = 500;

function dateRangeFor(range: TimeRange): { startDate?: string; endDate?: string } {
  if (range === 'all') return {};
  const now = new Date();
  const endDate = endOfDay(now).toISOString();
  switch (range) {
    case 'today': return { startDate: startOfDay(now).toISOString(), endDate };
    case '7days': return { startDate: startOfDay(subDays(now, 7)).toISOString(), endDate };
    case '30days':
    case '1month': return { startDate: startOfDay(subDays(now, 30)).toISOString(), endDate };
    case '3months': return { startDate: startOfDay(subDays(now, 90)).toISOString(), endDate };
    case '6months': return { startDate: startOfDay(subDays(now, 180)).toISOString(), endDate };
    default: return {};
  }
}

export function Mouvements() {
  const [items, setItems] = useState<Mouvement[]>([]);
  const [total, setTotal] = useState(0);
  const [nextPage, setNextPage] = useState(2);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'' | 'ENTREE' | 'SORTIE'>('');
  const [filterUser, setFilterUser] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sortField, setSortField] = useState<'dateHeure' | 'type' | 'quantite'>('dateHeure');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Chargement scopé par date à chaque changement de plage temporelle
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCurrentPage(1);
    api.getMouvements({ ...dateRangeFor(timeRange), page: 1, limit: FETCH_LIMIT })
      .then(res => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
        setNextPage(2);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [timeRange]);

  const hasMore = items.length < total;

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await api.getMouvements({ ...dateRangeFor(timeRange), page: nextPage, limit: FETCH_LIMIT });
      setItems(prev => [...prev, ...res.items]);
      setTotal(res.total);
      setNextPage(prev => prev + 1);
    } finally {
      setLoadingMore(false);
    }
  }, [timeRange, nextPage]);

  // Liste des utilisateurs pour le filtre
  const users = useMemo(() => {
    return Array.from(new Set(items.map(m => m.utilisateur))).filter(Boolean).sort();
  }, [items]);

  // La fenêtre temporelle est désormais filtrée côté serveur ; `items` est déjà scopé à `timeRange`.
  const timeFilteredmouvements = items;

  // Calculs des statistiques (basés sur les résultats filtrés par temps)
  const stats = useMemo(() => {
    const entrees = timeFilteredmouvements.filter(m => m.type === 'ENTREE');
    const sorties = timeFilteredmouvements.filter(m => m.type === 'SORTIE');

    return {
      totalMouvements: timeFilteredmouvements.length,
      totalEntrees: entrees.reduce((sum, m) => sum + m.quantite, 0),
      totalSorties: sorties.reduce((sum, m) => sum + m.quantite, 0),
      nombreEntrees: entrees.length,
      nombreSorties: sorties.length
    };
  }, [timeFilteredmouvements]);

  // Advanced Analytics & Decision Support
  const advancedAnalytics = useMemo(() => {
    const articleStats: Record<string, { outflows: number, totalMoved: number, currentStock: number, threshold: number, avgSize: number, counts: number }> = {};
    const hourActivity: Record<number, number> = {};
    const anomalies: Mouvement[] = [];

    timeFilteredmouvements.forEach(m => {
      const h = getHours(new Date(m.dateHeure));
      hourActivity[h] = (hourActivity[h] || 0) + 1;

      if (m.article) {
        if (!articleStats[m.article.id]) {
          articleStats[m.article.id] = {
            outflows: 0,
            totalMoved: 0,
            currentStock: m.article.quantite_stock,
            threshold: m.article.seuil_minimum,
            avgSize: 0,
            counts: 0
          };
        }
        const s = articleStats[m.article.id];
        if (m.type === 'SORTIE') s.outflows += m.quantite;
        s.totalMoved += m.quantite;
        s.counts += 1;
        s.avgSize = s.totalMoved / s.counts;

        // Anomaly Detection: movement > 3x average
        if (m.quantite > s.avgSize * 3 && s.counts > 3) {
          anomalies.push(m);
        }
      }
    });

    // Restock Priority Index (RPI)
    const restockPriority = Object.entries(articleStats)
      .map(([id, s]) => {
        const article = timeFilteredmouvements.find(m => m.article?.id === id)?.article;
        const stockRatio = s.currentStock / (s.threshold || 1);
        const priorityScore = (s.outflows * 2) / (stockRatio + 0.1);
        return {
          id,
          name: article?.nom || 'Article inconnu',
          score: priorityScore,
          stock: s.currentStock,
          threshold: s.threshold
        };
      })
      .filter(a => a.stock <= a.threshold * 1.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    // peak Hour
    const peakHour = Object.entries(hourActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 1)[0] as [string, number] | undefined;

    // Inventory Health Score
    const totalItemsChecked = Object.keys(articleStats).length;
    const belowThreshold = Object.values(articleStats).filter(s => s.currentStock <= s.threshold).length;
    const healthScore = totalItemsChecked > 0 ? Math.round(((totalItemsChecked - belowThreshold) / totalItemsChecked) * 100) : 100;

    return { restockPriority, peakHour, anomalies, healthScore, hourActivity };
  }, [timeFilteredmouvements]);

  // Analytics Simplifiées (Top Articles et Utilisateurs)
  const analytics = useMemo(() => {
    const articleCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    timeFilteredmouvements.forEach(m => {
      const artName = m.article?.nom || 'Article supprimé';
      articleCounts[artName] = (articleCounts[artName] || 0) + m.quantite;

      const userName = m.utilisateur || 'Inconnu';
      userCounts[userName] = (userCounts[userName] || 0) + 1;
    });

    const topArticles = Object.entries(articleCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const activeUsers = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    return { topArticles, activeUsers };
  }, [timeFilteredmouvements]);

  // Filtrage (recherche, type, utilisateur) et tri
  const finalFilteredMouvements = useMemo(() => {
    let filtered = timeFilteredmouvements.filter(mouvement => {
      const matchesSearch = !searchTerm || (
        mouvement.article?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mouvement.article?.code_barres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mouvement.utilisateur?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesType = !filterType || mouvement.type === filterType;
      const matchesUser = !filterUser || mouvement.utilisateur === filterUser;

      return matchesSearch && matchesType && matchesUser;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'dateHeure':
          comparison = new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'quantite':
          comparison = a.quantite - b.quantite;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [timeFilteredmouvements, searchTerm, filterType, filterUser, sortField, sortDirection]);

  const paginatedMouvements = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return finalFilteredMouvements.slice(start, start + itemsPerPage);
  }, [finalFilteredMouvements, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(finalFilteredMouvements.length / itemsPerPage);

  const handleSort = (field: 'dateHeure' | 'type' | 'quantite') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Article', 'Code-barres', 'Quantité', 'Utilisateur'];
    const csvContent = [
      headers.join(','),
      ...finalFilteredMouvements.map(m => [
        format(new Date(m.dateHeure), 'dd/MM/yyyy HH:mm'),
        m.type,
        m.article?.nom || 'Article supprimé',
        m.article?.code_barres || '',
        m.quantite,
        m.utilisateur
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `flux_stock_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  // const soldeNet = stats.totalEntrees - stats.totalSorties; // Removed as requested by lint

  return (
    <div className="space-y-8 animate-fade-in pb-20 md:pb-8">
      {/* En-tête Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
              <History size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Flux de Stock
            </h1>
          </div>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium ml-12">
            Analyse détaillée des entrées et sorties de matériel
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-bold hover:shadow-lg transition-all active:scale-95 group shadow-sm ml-12 md:ml-0"
        >
          <Download size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
          <span>Exporter le rapport</span>
        </button>
      </div>

      {/* Decision Support & Health Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Health Score */}
        <div className="glass p-6 rounded-[2.5rem] border border-white/20 dark:border-gray-800/50 flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <ShieldCheck size={48} className="text-emerald-500 mb-4 drop-shadow-lg" />
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1 uppercase tracking-tighter">Santé de l'Inventaire</h3>
          <div className="text-5xl font-black text-emerald-500 mb-2">{advancedAnalytics.healthScore}%</div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
            Équipements au-dessus du seuil critique
          </p>
          <div className="w-full mt-6 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-1000"
              style={{ width: `${advancedAnalytics.healthScore}%` }}
            />
          </div>
        </div>

        {/* Restock Priorities */}
        <div className="glass p-6 rounded-[2.5rem] border border-white/20 dark:border-gray-800/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
              <AlertTriangle size={20} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-tighter">Priorités de réappro</h3>
          </div>
          <div className="space-y-3">
            {advancedAnalytics.restockPriority.length > 0 ? advancedAnalytics.restockPriority.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white/40 dark:bg-gray-950/20 border border-white/10 rounded-2xl">
                <div className="flex flex-col max-w-[60%]">
                  <span className="font-bold text-sm text-gray-800 dark:text-white truncate">{item.name}</span>
                  <span className="text-[10px] font-black text-amber-500 uppercase">Stock: {item.stock} / {item.threshold}</span>
                </div>
                <div className="px-3 py-1 bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 font-black text-[10px] uppercase">
                  Critique
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-gray-400 text-xs italic font-bold">Aucune alerte prioritaire</div>
            )}
          </div>
        </div>

        {/* Temporal Insights & Peak Hour */}
        <div className="glass p-6 rounded-[2.5rem] border border-white/20 dark:border-gray-800/50 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
              <Clock size={20} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-tighter">Pics d'activité</h3>
          </div>

          <div className="flex-1 flex items-center justify-center py-4">
            {advancedAnalytics.peakHour ? (
              <div className="text-center group">
                <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  {advancedAnalytics.peakHour[0]}:00
                </div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                  Heure de pointe
                </div>
              </div>
            ) : <span className="text-gray-400 italic font-bold">Données insuffisantes</span>}
          </div>

          <div className="mt-4 flex gap-1 h-12 items-end">
            {Array.from({ length: 24 }).map((_, i) => {
              const val = advancedAnalytics.hourActivity[i] || 0;
              const max = Math.max(...Object.values(advancedAnalytics.hourActivity) as number[], 1);
              return (
                <div
                  key={i}
                  className="flex-1 bg-indigo-500/20 rounded-t-sm hover:bg-indigo-500 transition-colors cursor-help group relative"
                  style={{ height: `${(val / max) * 100}%` }}
                >
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] font-bold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity">
                    {val} ops à {i}h
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Statistiques Dynamiques (Glassmorphism) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-6 rounded-3xl border border-white/20 dark:border-gray-800/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-3xl -mr-8 -mt-8 group-hover:bg-blue-500/20 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400">
              <Package size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Mouvements</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalMouvements}</p>
          <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tight">Total transactions</div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/20 dark:border-gray-800/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-3xl -mr-8 -mt-8 group-hover:bg-emerald-500/20 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Entrées</span>
          </div>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">+{stats.totalEntrees}</p>
          <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tight">{stats.nombreEntrees} opérations</div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/20 dark:border-gray-800/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 blur-3xl -mr-8 -mt-8 group-hover:bg-rose-500/20 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-600 dark:text-rose-400">
              <TrendingDown size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Sorties</span>
          </div>
          <p className="text-3xl font-black text-rose-600 dark:text-rose-400">-{stats.totalSorties}</p>
          <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tight">{stats.nombreSorties} opérations</div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/20 dark:border-gray-800/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-3xl -mr-8 -mt-8 group-hover:bg-indigo-500/20 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Zap size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Anomalies</span>
          </div>
          <p className={`text-3xl font-black ${advancedAnalytics.anomalies.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
            {advancedAnalytics.anomalies.length}
          </p>
          <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tight">Flux inhabituels</div>
        </div>
      </div>

      {/* Analytics & Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Articles Analytics */}
        <div className="lg:col-span-2 glass p-6 rounded-[2.5rem] border border-white/20 dark:border-gray-800/50">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
                <Flame size={20} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Rotation des Équipements</h3>
            </div>
            <div className="flex bg-gray-100/50 dark:bg-gray-900/50 p-1 rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
              {(['all', 'today', '7days', '1month', '3months', '6months'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all whitespace-nowrap ${timeRange === range
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  {range === 'all' ? 'Tout' : range === 'today' ? '24h' : range === '7days' ? '7j' : range === '1month' ? '1m' : range === '3months' ? '3m' : '6m'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {analytics.topArticles.length > 0 ? analytics.topArticles.map(([name, count], i) => {
              const max = analytics.topArticles[0][1];
              const percentage = (count / max) * 100;
              return (
                <div key={name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-gray-700 dark:text-gray-300 truncate max-w-[70%]">{name}</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">{count} unités</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${percentage}%`, transitionDelay: `${i * 100}ms` }}
                    />
                  </div>
                </div>
              );
            }) : (
              <div className="h-40 flex items-center justify-center text-gray-400 italic">Aucune donnée disponible</div>
            )}
          </div>
        </div>

        {/* User Activity */}
        <div className="glass p-6 rounded-[2.5rem] border border-white/20 dark:border-gray-800/50">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Utilisateurs actifs</h3>
          </div>
          <div className="space-y-6">
            {analytics.activeUsers.length > 0 ? analytics.activeUsers.map(([name, count], i) => (
              <div key={name} className="flex items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-gray-950/20 border border-white/20 dark:border-gray-800/50 hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-black">
                    {name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-white text-sm truncate max-w-[120px]">{name}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Activité: {count} ops</span>
                  </div>
                </div>
                <div className={`text-xs font-black ${i === 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                  #{i + 1}
                </div>
              </div>
            )) : (
              <div className="h-40 flex items-center justify-center text-gray-400 italic">Aucune donnée</div>
            )}
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres Table */}
      <div className="glass p-4 rounded-3xl border border-white/20 dark:border-gray-800/50 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Rechercher par article, code-barres ou utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all dark:text-white font-medium text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as '' | 'ENTREE' | 'SORTIE')}
              className="w-full pl-10 pr-8 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all dark:text-white font-bold text-xs appearance-none cursor-pointer"
            >
              <option value="">Tous les types</option>
              <option value="ENTREE">Entrées (+)</option>
              <option value="SORTIE">Sorties (-)</option>
            </select>
          </div>

          <div className="relative flex-1 md:w-48">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full pl-10 pr-8 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all dark:text-white font-bold text-xs appearance-none cursor-pointer"
            >
              <option value="">Tous les utilisateurs</option>
              {users.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des Mouvements (Tableau Opti) */}
      {loading ? (
        <div className="py-24 glass rounded-[3rem] border border-white/20 dark:border-gray-800/50 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Chargement des mouvements...</p>
        </div>
      ) : (
      <div className="glass rounded-[2rem] border border-white/20 dark:border-gray-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th
                  className="px-6 py-5 font-black text-gray-500 uppercase text-[10px] tracking-widest cursor-pointer group"
                  onClick={() => handleSort('dateHeure')}
                >
                  <div className="flex items-center gap-2">
                    Date & Heure
                    <ArrowUpDown size={14} className={`transition-opacity ${sortField === 'dateHeure' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                  </div>
                </th>
                <th className="px-6 py-5 font-black text-gray-500 uppercase text-[10px] tracking-widest">Opération</th>
                <th className="px-6 py-5 font-black text-gray-500 uppercase text-[10px] tracking-widest">Équipement</th>
                <th
                  className="px-6 py-5 font-black text-gray-500 uppercase text-[10px] tracking-widest text-right cursor-pointer group"
                  onClick={() => handleSort('quantite')}
                >
                  <div className="flex items-center justify-end gap-2">
                    <ArrowUpDown size={14} className={`transition-opacity ${sortField === 'quantite' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    Quantité
                  </div>
                </th>
                <th className="px-6 py-5 font-black text-gray-500 uppercase text-[10px] tracking-widest text-right">Auteur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedMouvements.map((m) => (
                <tr key={m.id} className="hover:bg-white/20 dark:hover:bg-gray-950/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-gray-900 dark:text-white uppercase text-xs">
                        {format(new Date(m.dateHeure), 'dd MMM yyyy', { locale: fr })}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        {format(new Date(m.dateHeure), 'HH:mm')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider ${m.type === 'ENTREE'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                      {m.type === 'ENTREE' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {m.type === 'ENTREE' ? 'Entrée' : 'Sortie'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          {m.article?.nom || <span className="text-gray-400 font-medium italic">Article supprimé</span>}
                        </span>
                        {advancedAnalytics.anomalies.some(a => a.id === m.id) && (
                          <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded text-[8px] font-black uppercase flex items-center gap-1 border border-rose-500/20">
                            <Zap size={8} /> Anomaly
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 font-mono tracking-tighter">
                        {m.article?.code_barres || 'REF-N/A'}
                      </span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right font-black text-lg ${m.type === 'ENTREE' ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                    {m.type === 'ENTREE' ? '+' : '-'}{m.quantite}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/50">
                      <User size={10} />
                      {m.utilisateur || 'Système'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Premium */}
        {finalFilteredMouvements.length > itemsPerPage && (
          <div className="px-6 py-6 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Résultats: <span className="text-gray-900 dark:text-white">{finalFilteredMouvements.length}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-30 hover:shadow-md transition-all active:scale-90"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === pageNum
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-30 hover:shadow-md transition-all active:scale-90"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Historique complet : chargement par palier au-delà de la limite d'une requête */}
        {hasMore && (
          <div className="px-6 py-6 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {loadingMore ? <Loader2 size={18} className="animate-spin" /> : <History size={18} className="text-indigo-500" />}
              <span>{loadingMore ? 'Chargement...' : `Charger plus d'historique (${items.length}/${total})`}</span>
            </button>
          </div>
        )}
      </div>
      )}

      {/* Empty State */}
      {!loading && finalFilteredMouvements.length === 0 && (
        <div className="py-20 glass rounded-[3rem] border border-white/20 dark:border-gray-800/50 text-center animate-scale-in">
          <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <History className="w-10 h-10 text-indigo-400 dark:text-indigo-600" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Aucun mouvement trouvé</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto font-medium">
            {searchTerm || filterType || filterUser
              ? "Ajustez vos filtres ou votre recherche pour explorer les flux de stock."
              : "Les transactions apparaîtront ici dès que des équipements seront mouvementés."}
          </p>
        </div>
      )}
    </div>
  );
}