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

export function AlertsManager({ articles, onNavigateToArticle, onNavigateToSettings }: AlertsManagerProps) {
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
          action: () => showFeedback({
            type: 'info',
            title: 'Inventaire',
            message: 'Redirection vers la création d\'inventaire'
          }),
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
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Nouveau</span>;
      case 'read':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Lu</span>;
      case 'resolved':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Résolu</span>;
      case 'archived':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Archivé</span>;
    }
  };

  const getPriorityBadge = (priority: AlertPriority) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded";
    
    switch (priority) {
      case 'high':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Haute</span>;
      case 'medium':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Moyenne</span>;
      case 'low':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Basse</span>;
    }
  };

  const newAlertsCount = alerts.filter(a => a.status === 'new').length;
  const criticalAlertsCount = alerts.filter(a => a.priority === 'high' && a.status !== 'archived').length;

  return (
    <div className="flex-1 bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Centre d'Alertes
              </h1>
              <p className="text-gray-600">
                Surveillance et gestion des alertes système
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-red-900">Nouvelles</p>
                <p className="text-lg font-bold text-red-900">{newAlertsCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-yellow-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Critiques</p>
                <p className="text-lg font-bold text-yellow-900">{criticalAlertsCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Package className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-900">Stock</p>
                <p className="text-lg font-bold text-blue-900">
                  {alerts.filter(a => ['stock_out', 'stock_low', 'stock_critical'].includes(a.type)).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-900">Résolues</p>
                <p className="text-lg font-bold text-green-900">
                  {alerts.filter(a => a.status === 'resolved').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher dans les alertes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous les types</option>
              <option value="stock_out">Stock épuisé</option>
              <option value="stock_critical">Stock critique</option>
              <option value="stock_low">Stock faible</option>
              <option value="system">Système</option>
              <option value="inventory_required">Inventaire requis</option>
              <option value="new">Nouvelles</option>
              <option value="read">Lues</option>
              <option value="resolved">Résolues</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Priorité:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="showArchived" className="ml-2 text-sm text-gray-600">
              Afficher les archives
            </label>
          </div>
        </div>
      </div>

      {/* Liste des alertes */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucune alerte trouvée
            </h3>
            <p className="text-gray-600">
              {searchQuery || selectedFilter !== 'all' || priorityFilter !== 'all'
                ? 'Aucune alerte ne correspond aux filtres sélectionnés'
                : 'Aucune alerte active pour le moment'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
                  alert.status === 'new' ? 'border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getAlertIcon(alert.type, alert.priority)}
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 
                            className={`font-semibold ${
                              alert.status === 'new' ? 'text-gray-900' : 'text-gray-700'
                            }`}
                          >
                            {alert.title}
                          </h3>
                          {getPriorityBadge(alert.priority)}
                          {getStatusBadge(alert.status)}
                        </div>
                        
                        <p className="text-gray-600 mb-2">{alert.message}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {alert.timestamp.toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          
                          {alert.article && (
                            <div className="flex items-center">
                              <Package className="h-3 w-3 mr-1" />
                              {alert.article.nom}
                            </div>
                          )}
                          
                          {alert.metadata?.currentStock !== undefined && (
                            <div className="flex items-center">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Stock: {alert.metadata.currentStock}
                            </div>
                          )}
                        </div>
                        
                        {/* Actions de l'alerte */}
                        {alert.actions && alert.actions.length > 0 && (
                          <div className="flex items-center space-x-2 mt-3">
                            {alert.actions.map((action, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  action.action();
                                  if (alert.status === 'new') {
                                    markAsRead(alert.id);
                                  }
                                }}
                                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                  action.primary
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Menu d'actions */}
                    <div className="flex items-center space-x-2">
                      {alert.status === 'new' && (
                        <button
                          onClick={() => markAsRead(alert.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Marquer comme lu"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      
                      {alert.status !== 'resolved' && alert.status !== 'archived' && (
                        <button
                          onClick={() => markAsResolved(alert.id)}
                          className="p-1 text-green-400 hover:text-green-600"
                          title="Marquer comme résolu"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      
                      {alert.status !== 'archived' && (
                        <button
                          onClick={() => archiveAlert(alert.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Archiver"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteAlert(alert.id)}
                        className="p-1 text-red-400 hover:text-red-600"
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