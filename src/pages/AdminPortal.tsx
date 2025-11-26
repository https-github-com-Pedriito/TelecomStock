import React, { useState } from 'react';
import { Article, Mouvement, User } from '../types';
import { AdminDashboard } from '../components/AdminDashboard';
import { SettingsPage } from '../components/SettingsPage';
import { AlertsManager } from '../components/AlertsManager';
import { UserModal } from '../components/UserModal';
import {
  BarChart3,
  Settings as SettingsIcon,
  Bell,
  Users,
  Package,
  Activity,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';

interface AdminPortalProps {
  articles: Article[];
  mouvements: Mouvement[];
  users: User[];
  currentUser: User;
  onUpdateUser?: (id: string, data: Partial<User>) => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
  onAddUser?: (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => Promise<User>;
  addNotification?: (notif: { type: string; title: string; message: string; duration?: number }) => void;
  initialView?: AdminView;
  onNavigateToInventory?: () => void;
  onNavigateToArticles?: () => void;
}

type AdminView = 'dashboard' | 'alerts' | 'settings' | 'users';

export function AdminPortal({
  articles,
  mouvements,
  users,
  currentUser,
  initialView = 'dashboard',
  onUpdateUser,
  onDeleteUser,
  onAddUser,
  onNavigateToInventory,
  onNavigateToArticles,
  addNotification
}: AdminPortalProps) {
  const [currentView, setCurrentView] = useState<AdminView>(initialView);
  const [isCollapsed, setIsCollapsed] = useState(true); // Sidebar rétractée par défaut
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);

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
      className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out relative ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow-md hover:shadow-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-700"
        title={isCollapsed ? 'Étendre le menu' : 'Réduire le menu'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        )}
      </button>

      {/* Header */}
      <div className={`p-6 border-b border-gray-200 dark:border-gray-700 ${isCollapsed ? 'px-3' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
            <SettingsIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                Administration
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
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
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-left rounded-lg transition-colors group relative ${currentView === 'dashboard'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            title={isCollapsed ? 'Vue d\'ensemble' : ''}
          >
            <BarChart3 className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
            {!isCollapsed && <span>Vue d'ensemble</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Vue d'ensemble
              </div>
            )}
          </button>

          <button
            onClick={() => setCurrentView('alerts')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-left rounded-lg transition-colors group relative ${currentView === 'alerts'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
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
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-left rounded-lg transition-colors group relative ${currentView === 'users'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
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
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-left rounded-lg transition-colors group relative ${currentView === 'settings'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
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
      <div className={`p-4 border-t border-gray-200 dark:border-gray-700 ${isCollapsed ? 'px-2' : ''}`}>
        <div className="space-y-3">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} text-sm group relative`}>
            <div className={`flex items-center text-gray-600 dark:text-gray-400 ${isCollapsed ? '' : 'flex-shrink-0'}`}>
              <Package className="h-4 w-4 mr-2 flex-shrink-0" />
            {!isCollapsed && <span>Articles</span>}
          </div>
            {!isCollapsed && <span className="font-semibold text-gray-900 dark:text-white">{articles.length}</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Articles: {articles.length}
              </div>
            )}
          </div>

          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} text-sm group relative`}>
            <div className={`flex items-center text-gray-600 dark:text-gray-400 ${isCollapsed ? '' : 'flex-shrink-0'}`}>
              <Activity className="h-4 w-4 mr-2 flex-shrink-0" />
              {!isCollapsed && <span>Mouvements</span>}
            </div>
            {!isCollapsed && <span className="font-semibold text-gray-900 dark:text-white">{mouvements.length}</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Mouvements: {mouvements.length}
              </div>
            )}
          </div>

          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} text-sm group relative`}>
            <div className={`flex items-center text-red-600 dark:text-red-400 ${isCollapsed ? '' : 'flex-shrink-0'}`}>
              <Bell className="h-4 w-4 mr-2 flex-shrink-0" />
              {!isCollapsed && <span>Stock épuisé</span>}
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-red-900 dark:text-red-400">
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
              if (onNavigateToArticles) {
                onNavigateToArticles();
              }
            }}
            onNavigateToSettings={() => setCurrentView('settings')}
            onNavigateToInventory={onNavigateToInventory}
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
          <div className="flex-1 p-3 sm:p-6">
            <div className="max-w-6xl mx-auto">
              {/* Header avec bouton d'ajout */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Utilisateurs
                </h1>
                <button
                  onClick={() => {
                    setSelectedUser(undefined);
                    setIsUserModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm sm:text-base"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Nouvel utilisateur</span>
                  <span className="sm:hidden">Nouveau</span>
                </button>
              </div>

              {/* Liste des utilisateurs - Format Card pour mobile */}
              <div className="space-y-3">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Info utilisateur */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                            {user.prenom} {user.nom}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">{user.email}</p>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'admin' ? 'Admin' :
                              user.role === 'manager' ? 'Manager' : 'Technicien'}
                          </span>
                          
                          <span className="text-xs text-gray-500">
                            Modifié: {user.updated_at ? new Date(user.updated_at).toLocaleDateString('fr-FR') : 'Jamais'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setIsUserModalOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={18} />
                        </button>
                        
                        {user.id !== currentUser.id && onDeleteUser && (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${user.prenom} ${user.nom} ?`)) {
                                try {
                                  await onDeleteUser(user.id);
                                  addNotification && addNotification({
                                    type: 'success',
                                    title: 'Utilisateur supprimé',
                                    message: `L'utilisateur a été supprimé avec succès.`,
                                    duration: 4000
                                  });
                                } catch (error) {
                                  addNotification && addNotification({
                                    type: 'error',
                                    title: 'Erreur',
                                    message: `Erreur lors de la suppression de l'utilisateur`,
                                    duration: 5000
                                  });
                                }
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {users.length === 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <Users size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">Aucun utilisateur trouvé</p>
                  </div>
                )}
              </div>

              {/* Modal utilisateur */}
              <UserModal
                isOpen={isUserModalOpen}
                onClose={() => {
                  setIsUserModalOpen(false);
                  setSelectedUser(undefined);
                }}
                onSave={async (userData) => {
                  try {
                    if (selectedUser && onUpdateUser) {
                      await onUpdateUser(selectedUser.id, userData);
                      addNotification && addNotification({
                        type: 'success',
                        title: 'Utilisateur modifié',
                        message: `L'utilisateur a été modifié avec succès.`,
                        duration: 4000
                      });
                    } else if (onAddUser) {
                      await onAddUser(userData);
                      addNotification && addNotification({
                        type: 'success',
                        title: 'Utilisateur créé',
                        message: `L'utilisateur a été créé avec succès.`,
                        duration: 4000
                      });
                    }
                  } catch (error) {
                    console.error('Erreur lors de la sauvegarde:', error);
                    addNotification && addNotification({
                      type: 'error',
                      title: 'Erreur',
                      message: `Erreur lors de la sauvegarde de l'utilisateur`,
                      duration: 5000
                    });
                  }
                }}
                user={selectedUser}
                addNotification={addNotification}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900 w-full overflow-x-hidden">
      {renderSidebar()}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
        {renderContent()}
      </div>
    </div>
  );
}