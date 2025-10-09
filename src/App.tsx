import { useState, useEffect } from 'react';
import { ViewMode, Article, Mouvement, User, Fournisseur, CreateMouvementData } from './types';
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
import { Utilisateurs } from './pages/Utilisateurs';
import { Rapports } from './pages/Rapports';
import { Inventory } from './pages/Inventory';
import DebugConsole from './components/DebugConsole';
import { MobileDebugPanel } from './components/MobileDebugPanel';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [loginError, setLoginError] = useState('');
  
  // Système de notifications
  const { showStockNotification, NotificationContainer } = useNotifications();

  const {
    user,
    loading: authLoading,
    error: authError,
    isAuthenticated,
    signIn,
    signOut
  } = useAuth();

  const {
    articles,
    mouvements,
    loading: stockLoading,
    error: stockError,
    createArticle,
    updateArticle,
    deleteArticle,
    createMouvement,
    refreshFournisseurs,
    refreshAll
  } = useStock(showStockNotification); // Passer le callback de notification

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

  // État et gestion des fournisseurs
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loadingFournisseurs, setLoadingFournisseurs] = useState(true);
  const [errorFournisseurs, setErrorFournisseurs] = useState<string | null>(null);
  
  // Charger les fournisseurs au démarrage
  useEffect(() => {
    const fetchFournisseurs = async () => {
      try {
        setErrorFournisseurs(null);
        console.log('Chargement des fournisseurs...');
        const response = await api.get<Fournisseur[]>('/fournisseurs');
        console.log('Fournisseurs reçus:', response);
        setFournisseurs(response);
      } catch (error) {
        console.error('Erreur lors du chargement des fournisseurs:', error);
        setErrorFournisseurs(error instanceof Error ? error.message : 'Erreur inconnue');
      } finally {
        setLoadingFournisseurs(false);
      }
    };

    fetchFournisseurs();
  }, []);

  const addFournisseur = async (fournisseur: Omit<Fournisseur, 'id' | 'createdAt' | 'updatedAt'>): Promise<Fournisseur> => {
    try {
      console.log('Création d\'un nouveau fournisseur:', fournisseur);
      const newFournisseur = await api.post<Fournisseur>('/fournisseurs', fournisseur);
      console.log('Réponse de l\'API:', newFournisseur);
      setFournisseurs(prev => [...prev, newFournisseur]);
      return newFournisseur;
    } catch (error) {
      console.error('Erreur lors de la création du fournisseur:', error);
      throw error;
    }
  };

  const updateFournisseur = async (id: string, data: Partial<Fournisseur>) => {
    try {
      console.log('Mise à jour du fournisseur:', id, data);
      const updatedFournisseur = await api.put<Fournisseur>(`/fournisseurs/${id}`, data);
      console.log('Réponse de l\'API:', updatedFournisseur);
      setFournisseurs(prev =>
        prev.map(f => f.id === id ? updatedFournisseur : f)
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour du fournisseur:', error);
      throw error;
    }
  };

  const deleteFournisseur = async (id: string) => {
    try {
      console.log('Suppression du fournisseur:', id);
      await api.delete(`/fournisseurs/${id}`);
      console.log('Fournisseur supprimé avec succès');
      setFournisseurs(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Erreur lors de la suppression du fournisseur:', error);
      throw error;
    }
  };

  // État et gestion des utilisateurs
  const [usersForComponents, setUsersForComponents] = useState<User[]>([]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
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
    if (isAuthenticated && user?.role === 'admin') {
      try {
        const fetchedUsers = await api.getUsers();
        setUsersForComponents(fetchedUsers);
      } catch (error) {
        console.error('Erreur lors du rechargement des utilisateurs:', error);
      }
    }
  };

  // Gestion de l'inventaire (legacy - maintenant géré par useInventaire hook)
  // const addInventoryEntry = (entry: Omit<InventoryEntry, 'id' | 'dateHeure'>) => {
  //   const article = articles.find(a => a.id === entry.articleId);
  //   if (!article) {
  //     throw new Error('Article non trouvé');
  //   }

  //   const newEntry: InventoryEntry = {
  //     ...entry,
  //     id: crypto.randomUUID(),
  //     dateHeure: new Date()
  //   };

  //   void createMouvement({
  //     articleId: entry.articleId,
  //     quantite: entry.quantiteReelle - article.quantiteStock,
  //     type: entry.quantiteReelle > article.quantiteStock ? 'ENTREE' : 'SORTIE',
  //     utilisateur: entry.utilisateur,
  //     commentaire: 'Ajustement d\'inventaire'
  //   });

  //   return newEntry;
  // };

  // const finalizeInventoryReport = async () => {
  //   // TODO: Implémenter la finalisation du rapport d'inventaire
  //   console.log('Finalisation du rapport d\'inventaire');
  // };

  // Fonction de vérification des permissions
  const hasPermission = (permission: string) => {
    if (!user) return false;
    
    const role = user.role.toLowerCase();
    
    switch (permission) {
      case 'view_dashboard':
      case 'manage_users':
        return role === 'admin';
      case 'manage_articles':
        return role === 'admin' || role === 'manager';
      case 'view_articles':
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
      createdAt: new Date(),
      updatedAt: new Date()
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
          <Dashboard
            articles={articles}
            mouvements={mouvements}
            articlesWithAlerts={articlesWithAlerts}
            onRefreshData={refreshAll}
          />
        );
      case 'articles':
        return hasPermission('view_articles') && (
          <Articles
            articles={articles}
            hasPermission={hasPermission}
            fournisseurs={fournisseurs}
            onAddArticle={handleAddArticle}
            onUpdateArticle={updateArticle}
            onDeleteArticle={deleteArticle}
          />
        );
      case 'mouvements':
        return hasPermission('view_mouvements') && (
          <Mouvements
            articles={articles}
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
            fournisseurs={fournisseurs}
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
            fournisseurs={fournisseurs}
            onAddFournisseur={addFournisseur}
            onUpdateFournisseur={updateFournisseur}
            onDeleteFournisseur={deleteFournisseur}
            onRefreshFournisseurs={refreshFournisseurs}
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
          
          {/* Console de débogage pour la vérification de session */}
          <div className="bg-white rounded-lg shadow-lg p-6 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              🔍 Console de Débogage - Vérification Session
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Token présent:</span>
                <span className={localStorage.getItem('auth_token') ? 'text-green-600' : 'text-red-600'}>
                  {localStorage.getItem('auth_token') ? '✓ Oui' : '✗ Non'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">User Agent:</span>
                <span className="text-gray-800 text-xs break-all max-w-xs">
                  {navigator.userAgent.substring(0, 80)}...
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">URL actuelle:</span>
                <span className="text-gray-800 text-xs">
                  {window.location.href}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Protocole:</span>
                <span className={window.location.protocol === 'https:' ? 'text-green-600' : 'text-orange-600'}>
                  {window.location.protocol}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Connection:</span>
                <span className={navigator.onLine ? 'text-green-600' : 'text-red-600'}>
                  {navigator.onLine ? '✓ En ligne' : '✗ Hors ligne'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">API Base URL:</span>
                <span className="text-gray-800 text-xs">
                  {import.meta.env.VITE_API_URL || 'Non définie'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">API HTTPS URL:</span>
                <span className="text-gray-800 text-xs">
                  {import.meta.env.VITE_API_URL_HTTPS || 'Non définie'}
                </span>
              </div>
              
              {localStorage.getItem('auth_token') && (
                <div className="pt-3 border-t">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Token (début):</span>
                    <span className="text-gray-800 text-xs font-mono">
                      {localStorage.getItem('auth_token')?.substring(0, 20)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Token (fin):</span>
                    <span className="text-gray-800 text-xs font-mono">
                      ...{localStorage.getItem('auth_token')?.slice(-20)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t space-y-3">
              <p className="text-xs text-gray-500">Actions de débogage:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    localStorage.removeItem('auth_token');
                    window.location.reload();
                  }}
                  className="text-xs bg-red-100 text-red-700 p-2 rounded hover:bg-red-200 transition-colors"
                >
                  🗑️ Effacer token
                </button>
                <button
                  onClick={() => {
                    console.log('=== DEBUG AUTH ===');
                    console.log('Token:', localStorage.getItem('auth_token'));
                    console.log('URL:', window.location.href);
                    console.log('User Agent:', navigator.userAgent);
                    console.log('Online:', navigator.onLine);
                  }}
                  className="text-xs bg-blue-100 text-blue-700 p-2 rounded hover:bg-blue-200 transition-colors"
                >
                  📋 Log console
                </button>
              </div>
              
              <div className="text-center">
                <button
                  onClick={() => {
                    const httpUrl = window.location.href.replace('https:', 'http:').replace(':5174', ':3080');
                    window.location.href = httpUrl;
                  }}
                  className="text-xs bg-orange-100 text-orange-700 px-4 py-2 rounded hover:bg-orange-200 transition-colors"
                >
                  🔄 Basculer vers HTTP (port 3080)
                </button>
              </div>
            </div>
            
            {/* Compteur de temps */}
            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-xs text-gray-500">
                ⏱️ Temps d'attente: <span id="wait-timer">0</span>s
              </p>
              <script dangerouslySetInnerHTML={{
                __html: `
                  let startTime = Date.now();
                  setInterval(() => {
                    const elapsed = Math.floor((Date.now() - startTime) / 1000);
                    const timer = document.getElementById('wait-timer');
                    if (timer) timer.textContent = elapsed;
                  }, 1000);
                `
              }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUserForComponents) {
    return (
      <>
        <LoginForm onLogin={handleLogin} error={loginError} />
        <NotificationContainer />
        <DebugConsole />
      </>
    );
  }

  return (
    <>
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
      <DebugConsole />
      <MobileDebugPanel />
    </>
  );
}

export default App;