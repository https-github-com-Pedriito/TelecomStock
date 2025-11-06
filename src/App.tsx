import React,{ useState, useEffect, useCallback } from 'react';
import { ViewMode, Article, Mouvement, User, Fournisseur, Localisation, LocalisationInput, CreateMouvementData } from './types';
import { useStock } from './hooks/useStock';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './components/Notification';
import { api } from './lib/api';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './pages/DashboardMT';
import { Articles } from './pages/Articles';
import { Mouvements } from './pages/Mouvements';
import { Scanner } from './pages/Scanner';
import { Historique } from './pages/Historique';
import { Fournisseurs } from './pages/Fournisseurs';
import { Entrepots } from './pages/Entrepots';
import { Utilisateurs } from './pages/Utilisateurs';
import { Rapports } from './pages/Rapports';
import { Inventory } from './pages/Inventory';
import { AdminPortal } from './pages/AdminPortal';
import { FeedbackProvider } from './components/UXFeedback';
import { MobileBottomNav } from './components/MobileBottomNav';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [loginError, setLoginError] = useState('');
  const [useNewUX] = useState(true); // Toggle pour la nouvelle UX
  
  // Système de notifications
  const { showStockNotification, NotificationContainer } = useNotifications();

  const {
    user,
    loading: authLoading,
    isAuthenticated,
    signIn,
    signOut
  } = useAuth();

  const {
    articles,
    mouvements,
    fournisseurs: fournisseursFromHook,
    createArticle,
    updateArticle,
    deleteArticle,
    createMouvement,
    createFournisseur,
    updateFournisseur: updateFournisseurFromHook,
    deleteFournisseur: deleteFournisseurFromHook,
    refreshFournisseurs,
    refreshAll
  } = useStock(user, showStockNotification);

  const getArticlesWithAlerts = () => {
    return articles.filter(article => article.quantite_stock <= article.seuil_minimum);
  };

  const addArticle = async (articleData: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => {
    await createArticle(articleData);
  };

  const getArticleByCodeBarres = (codeBarres: string) => {
    return articles.find(article => article.code_barres === codeBarres);
  };

  const addMouvement = async (mouvementData: CreateMouvementData) => {
    try {
      console.log('App.tsx - Création d\'un mouvement:', mouvementData);
      const result = await createMouvement(mouvementData);
      console.log('App.tsx - Mouvement créé avec succès:', result);
      return result;
    } catch (error) {
      console.error('App.tsx - Erreur lors de la création du mouvement:', error);
      throw error;
    }
  };

  // Utiliser les fournisseurs du hook useStock
  // Pas besoin de gestion locale, tout est géré dans le hook
  
  // Adapter le type de updateFournisseur pour correspondre à l'interface attendue
  const updateFournisseurAdapter = async (id: string, updates: Partial<Fournisseur>): Promise<void> => {
    await updateFournisseurFromHook(id, updates);
  };

  // Gestion des localisations / entrepôts
  const [localisations, setLocalisations] = useState<Localisation[]>([]);
  const [loadingLocalisations, setLoadingLocalisations] = useState(true);
  const [errorLocalisations, setErrorLocalisations] = useState<string | null>(null);

  const refreshLocalisations = useCallback(async (): Promise<void> => {
    try {
      setErrorLocalisations(null);
      setLoadingLocalisations(true);
      console.log('Chargement des localisations...');
      const response = await api.getLocalisations();
      console.log('Localisations reçues:', response);
      setLocalisations(response as Localisation[]);
    } catch (error) {
      console.error('Erreur lors du chargement des localisations:', error);
      setErrorLocalisations(error instanceof Error ? error.message : 'Erreur inconnue');
      throw error;
    } finally {
      setLoadingLocalisations(false);
    }
  }, []);

  useEffect(() => {
    refreshLocalisations().catch(err => {
      console.error('Erreur lors de l\'initialisation des localisations:', err);
    });
  }, [refreshLocalisations]);

  const addLocalisation = async (localisation: LocalisationInput): Promise<Localisation> => {
    try {
      console.log('Création d\'une nouvelle localisation:', localisation);
      const newLocalisation = await api.createLocalisation(localisation) as Localisation;
      setLocalisations(prev => [...prev, newLocalisation]);
      return newLocalisation;
    } catch (error) {
      console.error('Erreur lors de la création de la localisation:', error);
      setErrorLocalisations(error instanceof Error ? error.message : 'Erreur inconnue');
      throw error;
    }
  };

  const updateLocalisation = async (id: string, data: Partial<LocalisationInput>): Promise<Localisation> => {
    try {
      console.log('Mise à jour de la localisation:', id, data);
      const updatedLocalisation = await api.updateLocalisation(id, data) as Localisation;
      setLocalisations(prev => prev.map(loc => loc.id === id ? updatedLocalisation : loc));
      return updatedLocalisation;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la localisation:', error);
      setErrorLocalisations(error instanceof Error ? error.message : 'Erreur inconnue');
      throw error;
    }
  };

  const deleteLocalisation = async (id: string): Promise<void> => {
    try {
      console.log('Suppression définitive de la localisation:', id);
      await api.deleteLocalisation(id);
      // Supprimer complètement de la liste locale
      setLocalisations(prev => prev.filter(loc => loc.id !== id));
    } catch (error) {
      console.error('Erreur lors de la suppression de la localisation:', error);
      setErrorLocalisations(error instanceof Error ? error.message : 'Erreur inconnue');
      throw error;
    }
  };

  const refreshAllData = useCallback(async () => {
    await Promise.allSettled([
      refreshAll(),
      refreshLocalisations(),
    ]);
  }, [refreshAll, refreshLocalisations]);

  // État et gestion des utilisateurs
  const [usersForComponents, setUsersForComponents] = useState<User[]>([]);

  useEffect(() => {
    if (isAuthenticated && user?.role?.toLowerCase() === 'admin') {
      const fetchUsers = async () => {
        try {
          const fetchedUsers = await api.getUsers();
          setUsersForComponents(fetchedUsers);
        } catch (error) {
          console.error('Erreur lors du chargement des utilisateurs:', error);
        }
      };
      
      void fetchUsers();
    }
  }, [user, isAuthenticated]);

  const updateUser = async (id: string, data: Partial<User>) => {
    await api.updateUser(id, data);
    setUsersForComponents(prev =>
      prev.map(u => u.id === id ? { ...u, ...data } : u)
    );
  };

  const deleteUser = async (id: string) => {
    await api.deleteUser(id);
    setUsersForComponents(prev => prev.filter(u => u.id !== id));
  };

  const refreshUsers = async () => {
    if (isAuthenticated && user?.role?.toLowerCase() === 'admin') {
      try {
        const fetchedUsers = await api.getUsers();
        setUsersForComponents(fetchedUsers);
      } catch (error) {
        console.error('Erreur lors du rechargement des utilisateurs:', error);
      }
    }
  };


  // Fonction de vérification des permissions
  const hasPermission = (permission: string) => {
    if (!user) return false;
    
    const role = user.role.toLowerCase();
    
    switch (permission) {
      case 'view_dashboard':
      case 'manage_users':
        return role === 'admin';
      case 'edit_articles':
        return role === 'admin' || role === 'manager';
      case 'delete_articles':
        return role === 'admin';
      case 'view_articles':
        return ['admin', 'manager', 'technicien'].includes(role);
      case 'view_prices':
        return role === 'admin' || role === 'manager';
      case 'manage_articles':
        return role === 'admin' || role === 'manager';
      case 'view_mouvements':
      case 'view_historique':
      case 'view_inventory':
        return ['admin', 'manager'].includes(role);
      case 'use_scanner':
        return ['admin', 'manager', 'technicien'].includes(role);
      default:
        return false;
    }
  };

  // Format current user for components
  const currentUserForComponents = user ? {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
    is_active: user.is_active
  } : null;

  // const [users, setUsers] = useState<User[]>([]); // Non utilisé

  const handleLogin = async (email: string, password: string) => {
    console.log('=== DÉBUT DE LA TENTATIVE DE CONNEXION ===');
    console.log('App: handleLogin called with email:', email);
    console.log('App: User Agent:', navigator.userAgent);
    console.log('App: Window Location:', {
      protocol: window.location.protocol,
      host: window.location.host,
      hostname: window.location.hostname,
      port: window.location.port
    });
    
    try {
      setLoginError('');
      console.log('App: Attempting to sign in...');
      await signIn(email, password);
      console.log('App: Sign in successful');
      
      // Rediriger vers la première page autorisée
      if (hasPermission('view_dashboard')) {
        console.log('App: User has dashboard permission, redirecting...');
        setCurrentView('dashboard');
      } else if (hasPermission('use_scanner')) {
        console.log('App: User has scanner permission, redirecting...');
        setCurrentView('scanner');
      }
    } catch (error) {
      console.error('App: Login error:', error);
      setLoginError(error instanceof Error ? error.message : 'Erreur de connexion');
      throw error; // Propager l'erreur pour que LoginForm puisse la traiter
    }
  };

  // Vérifier les permissions pour la vue actuelle
  const canAccessCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return hasPermission('view_dashboard');
      case 'articles':
        return hasPermission('view_articles');
      case 'mouvements':
        return hasPermission('view_mouvements');
      case 'scanner':
        return hasPermission('use_scanner');
      case 'historique':
        return hasPermission('view_historique');
      case 'fournisseurs':
      case 'entrepots':
      case 'utilisateurs':
      case 'rapports':
        return hasPermission('manage_users');
      case 'inventory':
        return hasPermission('view_inventory');
      default:
        return false;
    }
  };

  // Rediriger si l'utilisateur n'a pas accès à la vue actuelle
  useEffect(() => {
    if (isAuthenticated && !canAccessCurrentView()) {
      if (hasPermission('view_dashboard')) {
        setCurrentView('dashboard');
      } else if (hasPermission('use_scanner')) {
        setCurrentView('scanner');
      }
    }
  }, [currentView, isAuthenticated, hasPermission]);

  const handleAddArticle = (articleData: Omit<Article, 'id' | 'created_at' | 'updated_at'>): Article => {
    // Return a temporary article object while the real one is being created
    const tempArticle: Article = {
      id: 'temp_' + new Date().getTime(),
      ...articleData,
      created_at: new Date(),
      updated_at: new Date()
    };
    // Start creation in background
    void addArticle(articleData);
    return tempArticle;
  };

  const handleAddMouvement = (mouvementData: CreateMouvementData): Mouvement => {
    // Return a temporary mouvement object while the real one is being created
    const tempMouvement: Mouvement = {
      id: 'temp_' + new Date().getTime(),
      article: articles.find(a => a.id === mouvementData.article_id)!,
      quantite: mouvementData.quantite,
      type: mouvementData.type,
      utilisateur: mouvementData.utilisateur,
      projet: mouvementData.projet,
      technicien: mouvementData.technicien,
      commentaire: mouvementData.commentaire,
      dateHeure: new Date(),
      created_at: new Date()
    };
    // Start creation in background
    void addMouvement(mouvementData);
    return tempMouvement;
  };

  type UserFormData = Omit<User, 'id' | 'created_at' | 'updated_at'>;

  const handleAddUser = async (userData: UserFormData): Promise<User> => {
    // Create the new user via the API
    try {
      const newUser = await api.createUser({
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email,
        role: userData.role,
        is_active: userData.is_active ?? true
      });
      setUsersForComponents(prev => [...prev, newUser]);
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const renderCurrentView = () => {
    const articlesWithAlerts = getArticlesWithAlerts();

    switch (currentView) {
      case 'dashboard':
        return hasPermission('view_dashboard') && (
          useNewUX && user?.role?.toLowerCase() === 'admin' ? (
            <AdminPortal
              articles={articles}
              mouvements={mouvements}
              users={usersForComponents}
              currentUser={currentUserForComponents!}
              onUpdateUser={updateUser}
              onDeleteUser={deleteUser}
            />
          ) : (
            <Dashboard
              articles={articles}
              mouvements={mouvements}
              articlesWithAlerts={articlesWithAlerts}
              onRefreshData={refreshAllData}
            />
          )
        );
      case 'articles':
        return hasPermission('view_articles') && (
          <Articles
            articles={articles}
            hasPermission={hasPermission}
            fournisseurs={fournisseursFromHook}
            onAddArticle={handleAddArticle}
            onUpdateArticle={updateArticle}
            onDeleteArticle={deleteArticle}
          />
        );
      case 'mouvements':
        return hasPermission('view_mouvements') && (
          <Mouvements
            mouvements={mouvements}
          />
        );
      case 'scanner':
        return hasPermission('use_scanner') && (
          <Scanner
            articles={articles}
            getArticleByCodeBarres={getArticleByCodeBarres}
            onAddMouvement={handleAddMouvement}
            onAddArticle={handleAddArticle}
            fournisseurs={fournisseursFromHook}
            currentUser={currentUserForComponents!}
          />
        );
      case 'historique':
        return hasPermission('view_historique') && (
          <Historique
            mouvements={mouvements}
          />
        );
      case 'fournisseurs':
        return hasPermission('manage_users') && (
          <Fournisseurs
            fournisseurs={fournisseursFromHook}
            onAddFournisseur={createFournisseur}
            onUpdateFournisseur={updateFournisseurAdapter}
            onDeleteFournisseur={deleteFournisseurFromHook}
            onRefreshFournisseurs={refreshFournisseurs}
          />
        );
        case 'entrepots':
          return hasPermission('manage_users') && (
            <Entrepots
              localisations={localisations}
              loading={loadingLocalisations}
              error={errorLocalisations}
              onAddLocalisation={addLocalisation}
              onUpdateLocalisation={updateLocalisation}
              onDeleteLocalisation={deleteLocalisation}
              onRefreshLocalisations={refreshLocalisations}
            />
          );
      case 'utilisateurs':
        return hasPermission('manage_users') && (
          <Utilisateurs
            users={usersForComponents}
            currentUser={currentUserForComponents!}
            onAddUser={handleAddUser}
            onUpdateUser={updateUser}
            onDeleteUser={deleteUser}
            onRefreshUsers={refreshUsers}
          />
        );
      case 'rapports':
        return hasPermission('manage_users') && (
          <Rapports
            articles={articles}
            mouvements={mouvements}
            articlesWithAlerts={articlesWithAlerts}
          />
        );
      case 'inventory':
        return hasPermission('view_inventory') && (
          <Inventory
            articles={articles}
            users={usersForComponents}
            currentUser={currentUserForComponents!}
            getArticleByCodeBarres={getArticleByCodeBarres}
          />
        );
      default:
        return null;
    }
  };

  // Afficher une page de chargement pendant la vérification de l'authentification
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-2xl w-full mx-auto p-6">
          <div className="text-center mb-8">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Vérification de la session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUserForComponents) {
    return (
      <FeedbackProvider>
        <LoginForm onLogin={handleLogin} error={loginError} />
        <NotificationContainer />
      </FeedbackProvider>
    );
  }

  // Détection mobile
  const isMobile = window.innerWidth < 768;

  // Interface mobile avec nouvelle UX
  if (isMobile && useNewUX) {
    return (
      <FeedbackProvider>
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden max-w-full">
          {/* Header mobile avec déconnexion */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {currentUserForComponents.prenom.charAt(0)}{currentUserForComponents.nom.charAt(0)}
                </span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold text-gray-900 truncate">
                  {currentUserForComponents.prenom} {currentUserForComponents.nom}
                </span>
                <span className="text-xs text-gray-500 capitalize truncate">
                  {currentUserForComponents.role}
                </span>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center space-x-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex-shrink-0 ml-2"
              title="Se déconnecter"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium hidden sm:inline">Quitter</span>
            </button>
          </div>
          
          {/* Contenu principal - avec overflow contrôlé et padding généreux */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
            <div className="px-6 py-6 max-w-full">
              {renderCurrentView()}
            </div>
          </div>
          
          {/* Navigation mobile en bas */}
          <MobileBottomNav
            currentView={currentView}
            onViewChange={setCurrentView}
            hasPermission={hasPermission}
            userRole={user?.role}
            alertsCount={getArticlesWithAlerts().length}
          />
        </div>
        
        <NotificationContainer />
      </FeedbackProvider>
    );
  }

  // Interface desktop standard
  return (
    <FeedbackProvider>
      <Layout
        currentView={currentView}
        onViewChange={setCurrentView}
        alertsCount={getArticlesWithAlerts().length}
        currentUser={currentUserForComponents}
        onLogout={signOut}
        hasPermission={hasPermission}
      >
        {renderCurrentView()}
      </Layout>
      <NotificationContainer />
    </FeedbackProvider>
  );
}

export default App;