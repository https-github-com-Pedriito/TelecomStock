import { useState } from 'react';
import { Article, Mouvement, User } from '../types';
import { AdminDashboard } from '../components/AdminDashboard';
import { SettingsPage } from '../components/SettingsPage';
import { AlertsManager } from '../components/AlertsManager';
import { 
  BarChart3, 
  Settings as SettingsIcon, 
  Bell, 
  Users,
  Package,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AdminPortalProps {
  articles: Article[];
  mouvements: Mouvement[];
  users: User[];
  currentUser: User;
  onUpdateUser?: (id: string, data: Partial<User>) => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
}

type AdminView = 'dashboard' | 'alerts' | 'settings' | 'users';

export function AdminPortal({ 
  articles, 
  mouvements, 
  users, 
  currentUser
}: AdminPortalProps) {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNavigate = (view: string) => {
    setCurrentView(view as AdminView);
  };

  const handleSaveSettings = async (settings: any) => {
    console.log('Sauvegarde des paramètres:', settings);
    // Implémenter la sauvegarde des paramètres
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const renderSidebar = () => (
    <div 
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out relative ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-10 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:shadow-lg transition-all hover:bg-gray-50"
        title={isCollapsed ? 'Étendre le menu' : 'Réduire le menu'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        )}
      </button>

      {/* Header */}
      <div className={`p-6 border-b border-gray-200 ${isCollapsed ? 'px-3' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
            <SettingsIcon className="h-6 w-6 text-blue-600" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                Administration
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {currentUser.prenom} {currentUser.nom}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 p-4 ${isCollapsed ? 'px-2' : ''}`}>
        <div className="space-y-1">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-left rounded-lg transition-colors group relative ${
              currentView === 'dashboard'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            title={isCollapsed ? 'Dashboard' : ''}
          >
            <BarChart3 className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
            {!isCollapsed && <span>Dashboard</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Dashboard
              </div>
            )}
          </button>

          <button
            onClick={() => setCurrentView('alerts')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-left rounded-lg transition-colors group relative ${
              currentView === 'alerts'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            title={isCollapsed ? 'Centre d\'Alertes' : ''}
          >
            <div className="relative flex-shrink-0">
              <Bell className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
              {articles.filter(a => a.quantite_stock === 0).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full text-[10px]">
                  {articles.filter(a => a.quantite_stock === 0).length}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <>
                <span>Centre d'Alertes</span>
                {articles.filter(a => a.quantite_stock === 0).length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {articles.filter(a => a.quantite_stock === 0).length}
                  </span>
                )}
              </>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Centre d'Alertes
              </div>
            )}
          </button>

          <button
            onClick={() => setCurrentView('users')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-left rounded-lg transition-colors group relative ${
              currentView === 'users'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            title={isCollapsed ? 'Utilisateurs' : ''}
          >
            <Users className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
            {!isCollapsed && <span>Utilisateurs</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Utilisateurs
              </div>
            )}
          </button>

          <button
            onClick={() => setCurrentView('settings')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-left rounded-lg transition-colors group relative ${
              currentView === 'settings'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            title={isCollapsed ? 'Paramètres Système' : ''}
          >
            <SettingsIcon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
            {!isCollapsed && <span>Paramètres Système</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Paramètres Système
              </div>
            )}
          </button>
        </div>
      </nav>

      {/* Statistiques rapides */}
      <div className={`p-4 border-t border-gray-200 ${isCollapsed ? 'px-2' : ''}`}>
        <div className="space-y-3">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} text-sm group relative`}>
            <div className={`flex items-center text-gray-600 ${isCollapsed ? '' : 'flex-shrink-0'}`}>
              <Package className="h-4 w-4 mr-2 flex-shrink-0" />
              {!isCollapsed && <span>Articles</span>}
            </div>
            {!isCollapsed && <span className="font-semibold text-gray-900">{articles.length}</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Articles: {articles.length}
              </div>
            )}
          </div>
          
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} text-sm group relative`}>
            <div className={`flex items-center text-gray-600 ${isCollapsed ? '' : 'flex-shrink-0'}`}>
              <Activity className="h-4 w-4 mr-2 flex-shrink-0" />
              {!isCollapsed && <span>Mouvements</span>}
            </div>
            {!isCollapsed && <span className="font-semibold text-gray-900">{mouvements.length}</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Mouvements: {mouvements.length}
              </div>
            )}
          </div>
          
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} text-sm group relative`}>
            <div className={`flex items-center text-red-600 ${isCollapsed ? '' : 'flex-shrink-0'}`}>
              <Bell className="h-4 w-4 mr-2 flex-shrink-0" />
              {!isCollapsed && <span>Stock épuisé</span>}
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-red-900">
                {articles.filter(a => a.quantite_stock === 0).length}
              </span>
            )}
            {isCollapsed && articles.filter(a => a.quantite_stock === 0).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full text-[10px]">
                {articles.filter(a => a.quantite_stock === 0).length}
              </span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Stock épuisé: {articles.filter(a => a.quantite_stock === 0).length}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <AdminDashboard
            articles={articles}
            mouvements={mouvements}
            inventaires={[]} // TODO: Passer les vrais inventaires
            onNavigate={handleNavigate}
          />
        );
      
      case 'alerts':
        return (
          <AlertsManager
            articles={articles}
            onNavigateToArticle={(articleId) => {
              console.log('Navigation vers article:', articleId);
            }}
            onNavigateToSettings={() => setCurrentView('settings')}
          />
        );
      
      case 'settings':
        return (
          <SettingsPage
            onSave={handleSaveSettings}
            initialSettings={{
              defaultStockThreshold: 10,
              adminEmail: currentUser.email
            }}
          />
        );
      
      case 'users':
        return (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Gestion des Utilisateurs
              </h1>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Utilisateurs du Système
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Utilisateur
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rôle
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dernière connexion
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.prenom} {user.nom}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role === 'admin' ? 'Administrateur' :
                               user.role === 'manager' ? 'Manager' : 
                               user.role === 'technicien' ? 'Technicien' : 'Utilisateur'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.updated_at ? new Date(user.updated_at).toLocaleDateString('fr-FR') : 'Jamais'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {renderSidebar()}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}