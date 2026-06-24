import { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Clock,
  Package,
  TrendingDown,
  Archive,
  Trash2,
  Eye,
  Settings,
  RefreshCw
} from 'lucide-react';
import { Article } from '../types';
import { useFeedback } from './UXFeedback';

interface AlertsManagerProps {
  articles: Article[];
  onNavigateToArticle?: (articleId: string) => void;
  onNavigateToSettings?: () => void;
  onNavigateToInventory?: () => void;
}

export type AlertType = 
  | 'stock_out' 
  | 'stock_low' 
  | 'stock_critical' 
  | 'movement_suspicious' 
  | 'inventory_required'
  | 'price_change'
  | 'system'
  | 'user_action';

export type AlertPriority = 'high' | 'medium' | 'low';
export type AlertStatus = 'new' | 'read' | 'resolved' | 'archived';

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  status: AlertStatus;
  title: string;
  message: string;
  timestamp: Date;
  articleId?: string;
  article?: Article;
  metadata?: {
    currentStock?: number;
    threshold?: number;
    previousValue?: number;
    newValue?: number;
    userId?: string;
    actionType?: string;
  };
  actions?: {
    label: string;
    action: () => void;
    primary?: boolean;
  }[];
}

export function AlertsManager({ 
  articles, 
  onNavigateToArticle,
  onNavigateToSettings,
  onNavigateToInventory
}: AlertsManagerProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | AlertType | AlertStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | AlertPriority>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const { showFeedback } = useFeedback();

  // Génération automatique des alertes basée sur les articles
  useEffect(() => {
    generateAlerts();
  }, [articles]);

  // Filtrage des alertes
  useEffect(() => {
    let filtered = alerts;

    // Filtre par type/statut
    if (selectedFilter !== 'all') {
      if (['stock_out', 'stock_low', 'stock_critical', 'movement_suspicious', 'inventory_required', 'price_change', 'system', 'user_action'].includes(selectedFilter as string)) {
        filtered = filtered.filter(alert => alert.type === selectedFilter);
      } else {
        filtered = filtered.filter(alert => alert.status === selectedFilter);
      }
    }

    // Filtre par priorité
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(alert => alert.priority === priorityFilter);
    }

    // Filtre par recherche
    if (searchQuery) {
      filtered = filtered.filter(alert => 
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.article?.nom.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Masquer/afficher les archives
    if (!showArchived) {
      filtered = filtered.filter(alert => alert.status !== 'archived');
    }

    // Trier par priorité puis par date
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    setFilteredAlerts(filtered);
  }, [alerts, selectedFilter, priorityFilter, searchQuery, showArchived]);

  const generateAlerts = () => {
    const newAlerts: Alert[] = [];
    const now = new Date();

    articles.forEach(article => {
      const threshold = article.seuil_minimum || 10;
      const stock = article.quantite_stock;

      // Stock épuisé
      if (stock === 0) {
        newAlerts.push({
          id: `stock-out-${article.id}`,
          type: 'stock_out',
          priority: 'high',
          status: 'new',
          title: 'Stock épuisé',
          message: `L'article "${article.nom}" n'est plus en stock`,
          timestamp: now,
          articleId: article.id,
          article,
          metadata: {
            currentStock: stock,
            threshold
          },
          actions: [
            {
              label: 'Voir l\'article',
              action: () => onNavigateToArticle?.(article.id),
              primary: true
            },
            {
              label: 'Commander',
              action: () => showFeedback({
                type: 'info',
                title: 'Commande',
                message: 'Fonctionnalité de commande à implémenter'
              })
            }
          ]
        });
      }
      // Stock critique (< 50% du seuil)
      else if (stock < threshold * 0.5) {
        newAlerts.push({
          id: `stock-critical-${article.id}`,
          type: 'stock_critical',
          priority: 'high',
          status: 'new',
          title: 'Stock critique',
          message: `Stock très faible pour "${article.nom}" (${stock} restant)`,
          timestamp: now,
          articleId: article.id,
          article,
          metadata: {
            currentStock: stock,
            threshold
          },
          actions: [
            {
              label: 'Voir l\'article',
              action: () => onNavigateToArticle?.(article.id)
            }
          ]
        });
      }
      // Stock faible
      else if (stock < threshold) {
        newAlerts.push({
          id: `stock-low-${article.id}`,
          type: 'stock_low',
          priority: 'medium',
          status: 'new',
          title: 'Stock faible',
          message: `Stock sous le seuil pour "${article.nom}" (${stock}/${threshold})`,
          timestamp: now,
          articleId: article.id,
          article,
          metadata: {
            currentStock: stock,
            threshold
          },
          actions: [
            {
              label: 'Voir l\'article',
              action: () => onNavigateToArticle?.(article.id)
            }
          ]
        });
      }
    });

    // Ajouter quelques alertes système d'exemple
    newAlerts.push({
      id: 'system-backup',
      type: 'system',
      priority: 'low',
      status: 'new',
      title: 'Sauvegarde automatique',
      message: 'Sauvegarde quotidienne effectuée avec succès',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Il y a 2h
      actions: [
        {
          label: 'Voir les paramètres',
          action: () => onNavigateToSettings?.()
        }
      ]
    });

    newAlerts.push({
      id: 'inventory-reminder',
      type: 'inventory_required',
      priority: 'medium',
      status: 'new',
      title: 'Inventaire recommandé',
      message: 'Aucun inventaire effectué depuis plus de 30 jours',
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Hier
      actions: [
        {
          label: 'Créer un inventaire',
          action: () => {
            if (onNavigateToInventory) {
              onNavigateToInventory();
            } else {
              showFeedback({
                type: 'info',
                title: 'Inventaire',
                message: 'Navigation vers l\'inventaire...'
              });
            }
          },
          primary: true
        }
      ]
    });

    setAlerts(newAlerts);
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'read' as AlertStatus }
        : alert
    ));
  };

  const markAsResolved = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'resolved' as AlertStatus }
        : alert
    ));
    
    showFeedback({
      type: 'success',
      title: 'Alerte résolue',
      message: 'L\'alerte a été marquée comme résolue'
    });
  };

  const archiveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'archived' as AlertStatus }
        : alert
    ));
    
    showFeedback({
      type: 'info',
      title: 'Alerte archivée',
      message: 'L\'alerte a été déplacée vers les archives'
    });
  };

  const deleteAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    showFeedback({
      type: 'success',
      title: 'Alerte supprimée',
      message: 'L\'alerte a été supprimée définitivement'
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    generateAlerts();
    setRefreshing(false);
    
    showFeedback({
      type: 'success',
      title: 'Actualisation terminée',
      message: 'Les alertes ont été mises à jour'
    });
  };

  const getAlertIcon = (type: AlertType, priority: AlertPriority) => {
    const iconClass = `h-5 w-5 ${
      priority === 'high' ? 'text-red-500' :
      priority === 'medium' ? 'text-yellow-500' :
      'text-blue-500'
    }`;

    switch (type) {
      case 'stock_out':
      case 'stock_critical':
        return <XCircle className={iconClass} />;
      case 'stock_low':
        return <AlertTriangle className={iconClass} />;
      case 'movement_suspicious':
        return <AlertCircle className={iconClass} />;
      case 'inventory_required':
        return <Package className={iconClass} />;
      case 'system':
        return <Settings className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  const getStatusBadge = (status: AlertStatus) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    
    switch (status) {
      case 'new':
        return <span className={`${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400`}>Nouveau</span>;
      case 'read':
        return <span className={`${baseClasses} bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400`}>Lu</span>;
      case 'resolved':
        return <span className={`${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400`}>Résolu</span>;
      case 'archived':
        return <span className={`${baseClasses} bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300`}>Archivé</span>;
    }
  };

  const getPriorityBadge = (priority: AlertPriority) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded";
    
    switch (priority) {
      case 'high':
        return <span className={`${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400`}>Haute</span>;
      case 'medium':
        return <span className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400`}>Moyenne</span>;
      case 'low':
        return <span className={`${baseClasses} bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400`}>Basse</span>;
    }
  };

  const newAlertsCount = alerts.filter(a => a.status === 'new').length;
  const criticalAlertsCount = alerts.filter(a => a.priority === 'high' && a.status !== 'archived').length;

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Centre d'Alertes
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Surveillance et gestion des alertes système
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
            
            <button
              onClick={onNavigateToSettings}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Paramètres</span>
            </button>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center">
              <AlertTriangle className="h-4 sm:h-5 w-4 sm:w-5 text-red-500 dark:text-red-400 mr-2 flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-red-900 dark:text-red-300">Nouvelles</p>
                <p className="text-base sm:text-lg font-bold text-red-900 dark:text-red-100">{newAlertsCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-center">
              <XCircle className="h-4 sm:h-5 w-4 sm:w-5 text-yellow-500 dark:text-yellow-400 mr-2 flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-yellow-900 dark:text-yellow-300">Critiques</p>
                <p className="text-base sm:text-lg font-bold text-yellow-900 dark:text-yellow-100">{criticalAlertsCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center">
              <Package className="h-4 sm:h-5 w-4 sm:w-5 text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-300">Stock</p>
                <p className="text-base sm:text-lg font-bold text-blue-900 dark:text-blue-100">
                  {alerts.filter(a => ['stock_out', 'stock_low', 'stock_critical'].includes(a.type)).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-center">
              <CheckCircle className="h-4 sm:h-5 w-4 sm:w-5 text-green-500 dark:text-green-400 mr-2 flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-900 dark:text-green-300">Résolues</p>
                <p className="text-base sm:text-lg font-bold text-green-900 dark:text-green-100">
                  {alerts.filter(a => a.status === 'resolved').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2 flex-1 min-w-[150px]">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous types</option>
              <option value="stock_out">Épuisé</option>
              <option value="stock_critical">Critique</option>
              <option value="stock_low">Faible</option>
              <option value="system">Système</option>
              <option value="inventory_required">Inventaire</option>
              <option value="new">Nouvelles</option>
              <option value="read">Lues</option>
              <option value="resolved">Résolues</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">Priorité:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toutes</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showArchived"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="showArchived" className="ml-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Archives
            </label>
          </div>
        </div>
      </div>

      {/* Liste des alertes */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 sm:h-16 w-12 sm:w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Aucune alerte trouvée
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {searchQuery || selectedFilter !== 'all' || priorityFilter !== 'all'
                ? 'Aucune alerte ne correspond aux filtres sélectionnés'
                : 'Aucune alerte active pour le moment'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
                  alert.status === 'new' 
                    ? 'border-l-4 border-l-blue-500 border-t border-r border-b border-gray-200 dark:border-gray-700' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="p-3 sm:p-4">
                  {/* Header avec icône, titre et badges */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {getAlertIcon(alert.type, alert.priority)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className={`text-sm sm:text-base font-semibold truncate ${
                          alert.status === 'new' ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {alert.title}
                        </h3>
                        {getPriorityBadge(alert.priority)}
                        {getStatusBadge(alert.status)}
                      </div>
                      
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {alert.message}
                      </p>
                      
                      {/* Métadonnées compactes */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">
                            {alert.timestamp.toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        {alert.article && (
                          <div className="flex items-center">
                            <Package className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{alert.article.nom}</span>
                          </div>
                        )}
                        
                        {alert.metadata?.currentStock !== undefined && (
                          <div className="flex items-center">
                            <TrendingDown className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span>Stock: {alert.metadata.currentStock}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Actions de l'alerte */}
                      {alert.actions && alert.actions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          {alert.actions.map((action, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                action.action();
                                if (alert.status === 'new') {
                                  markAsRead(alert.id);
                                }
                              }}
                              className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                                action.primary
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Menu d'actions - Colonne à droite */}
                    <div className="flex flex-col sm:flex-row items-center gap-1 flex-shrink-0">
                      {alert.status === 'new' && (
                        <button
                          onClick={() => markAsRead(alert.id)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Marquer comme lu"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      
                      {alert.status !== 'resolved' && alert.status !== 'archived' && (
                        <button
                          onClick={() => markAsResolved(alert.id)}
                          className="p-1.5 text-green-400 hover:text-green-600 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                          title="Marquer comme résolu"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      
                      {alert.status !== 'archived' && (
                        <button
                          onClick={() => archiveAlert(alert.id)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Archiver"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteAlert(alert.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
