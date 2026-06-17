import React, { useState, useEffect, useCallback } from 'react';
import { initAnalytics, trackPageView, trackAddArticle } from './lib/analytics';
import { ViewMode, Article, Mouvement, User, Fournisseur, Localisation, LocalisationInput, CreateMouvementData } from './types';
import { useStock } from './hooks/useStock';
import { useAuth } from './hooks/useAuth';
import { useDarkMode } from './hooks/useDarkMode';
import { useNotifications } from './components/Notification';
import { api } from './lib/api';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { FeedbackProvider } from './components/UXFeedback';
import { MobileBottomNav } from './components/MobileBottomNav';
import { UserProfileModal } from './components/UserProfileModal';
import { Analytics } from "@vercel/analytics/react";
import { CookieBanner } from './components/CookieBanner';
import { LandingPage } from './pages/LandingPage';
import { PricingPage } from './pages/PricingPage';
import { FAQPage } from './pages/FAQPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';

type PublicView = 'landing' | 'login' | 'pricing' | 'faq' | 'privacy' | 'terms';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./pages/DashboardMT').then(module => ({ default: module.Dashboard })));
const Articles = React.lazy(() => import('./pages/Articles').then(module => ({ default: module.Articles })));
const Mouvements = React.lazy(() => import('./pages/Mouvements').then(module => ({ default: module.Mouvements })));
const Scanner = React.lazy(() => import('./pages/Scanner').then(module => ({ default: module.Scanner })));
const Historique = React.lazy(() => import('./pages/Historique').then(module => ({ default: module.Historique })));
const Fournisseurs = React.lazy(() => import('./pages/Fournisseurs').then(module => ({ default: module.Fournisseurs })));
const Entrepots = React.lazy(() => import('./pages/Entrepots').then(module => ({ default: module.Entrepots })));
const Utilisateurs = React.lazy(() => import('./pages/Utilisateurs').then(module => ({ default: module.Utilisateurs })));
const Inventory = React.lazy(() => import('./pages/Inventory').then(module => ({ default: module.Inventory })));

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [publicView, setPublicView] = useState<PublicView>('landing');
  const [hasCookieConsent, setHasCookieConsent] = useState<boolean | null>(() => {
    const consent = localStorage.getItem('telecomstock-cookie-consent');
    if (consent === 'accepted') return true;
    if (consent === 'declined') return false;
    return null;
  });

  useEffect(() => {
    if (hasCookieConsent) {
      initAnalytics();
    }
  }, [hasCookieConsent]);

  // Initialiser Google Analytics au montage si déjà consenti
  useEffect(() => {
    if (hasCookieConsent) {
      initAnalytics();
    }
  }, []);

  // Tracker chaque changement de page
  useEffect(() => {
    trackPageView(`/${currentView}`);
  }, [currentView]);
  const [loginError, setLoginError] = useState('');
  const [useNewUX] = useState(true); // Toggle pour la nouvelle UX

  // Mode sombre
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Système de notifications centralisé
  const { showStockNotification, addNotification, NotificationContainer } = useNotifications();

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
    refreshLocalisations,
    refreshUsers,
    refreshAll,
    localisations,
    users: usersForComponents,
    loading,
    error,
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

  const updateFournisseurAdapter = async (id: string, updates: Partial<Fournisseur>): Promise<void> => {
    await updateFournisseurFromHook(id, updates);
  };

  const addLocalisation = async (localisation: LocalisationInput): Promise<Localisation> => {
    const newLocalisation = await api.createLocalisation(localisation) as Localisation;
    await refreshLocalisations();
    return newLocalisation;
  };

  const updateLocalisation = async (id: string, data: Partial<LocalisationInput>): Promise<Localisation> => {
    const updatedLocalisation = await api.updateLocalisation(id, data) as Localisation;
    await refreshLocalisations();
    return updatedLocalisation;
  };

  const deleteLocalisation = async (id: string): Promise<void> => {
    await api.deleteLocalisation(id);
    await refreshLocalisations();
  };

  const refreshAllData = useCallback(async () => {
    await refreshAll();
  }, [refreshAll]);

  const updateUser = async (id: string, data: Partial<User>) => {
    await api.updateUser(id, data);
    await refreshUsers();
  };

  const deleteUser = async (id: string) => {
    await api.deleteUser(id);
    await refreshUsers();
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

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoginError('');
      await signIn(email, password);
      if (hasPermission('view_dashboard')) {
        setCurrentView('dashboard');
      } else if (hasPermission('use_scanner')) {
        setCurrentView('scanner');
      }
    } catch (error) {
      console.error('App: Login error:', error);
      setLoginError(error instanceof Error ? error.message : 'Erreur de connexion');
      throw error;
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await api.forgotPassword(email);
    } catch (error) {
      console.error('App: Forgot password error:', error);
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
      case 'inventory':
        return hasPermission('view_inventory');
      case 'utilisateurs':
        return hasPermission('manage_users');
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
    const articleName = articleData.nom || 'Article inconnu';
    const articleCategory = articleData.categorie || 'Article';
    trackAddArticle(articleName, articleCategory);
    const tempArticle: Article = {
      id: 'temp_' + new Date().getTime(),
      ...articleData,
      created_at: new Date(),
      updated_at: new Date()
    };
    void addArticle(articleData);
    return tempArticle;
  };

  const handleAddMouvement = (mouvementData: CreateMouvementData): Mouvement => {
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
    void addMouvement(mouvementData);
    return tempMouvement;
  };

  type UserFormData = Omit<User, 'id' | 'created_at' | 'updated_at'>;

  const handleAddUser = async (userData: UserFormData): Promise<User> => {
    try {
      const newUser = await api.createUser({
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email,
        role: userData.role,
        is_active: userData.is_active ?? true
      });
      await refreshUsers();
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    try {
      await api.changePassword(oldPassword, newPassword);
      addNotification({
        type: 'success',
        title: 'Mot de passe modifié',
        message: 'Votre mot de passe a été modifié avec succès',
        duration: 4000
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        throw new Error('Mot de passe actuel incorrect');
      } else if (error.message?.includes('400')) {
        throw new Error('Le nouveau mot de passe ne respecte pas les critères requis');
      } else {
        throw new Error(error.message || 'Erreur lors de la modification du mot de passe');
      }
    }
  };

  const handleAcceptCookies = () => {
    localStorage.setItem('telecomstock-cookie-consent', 'accepted');
    setHasCookieConsent(true);
  };

  const handleDeclineCookies = () => {
    localStorage.setItem('telecomstock-cookie-consent', 'declined');
    setHasCookieConsent(false);
  };

  const handleViewPrivacy = () => {
    if (isAuthenticated) {
      // Si l'utilisateur est connecté, on peut éventuellement lui montrer une modale 
      // ou changer de vue, mais ici on va juste changer la vue publique si non connecté
      // ou ne rien faire si déjà dans l'app pour éviter de casser le flux
    } else {
      setPublicView('privacy');
    }
  };

  const renderCurrentView = () => {
    const articlesWithAlerts = getArticlesWithAlerts();

    return (
      <React.Suspense fallback={<PageLoader />}>
        {(() => {
          switch (currentView) {
            case 'dashboard':
              return hasPermission('view_dashboard') && (
                <Dashboard
                  articles={articles}
                  mouvements={mouvements}
                  articlesWithAlerts={articlesWithAlerts}
                  onRefreshData={refreshAllData}
                />
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
                  addNotification={addNotification}
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
              return (hasPermission('manage_users') || hasPermission('view_inventory')) && (
                <Fournisseurs
                  fournisseurs={fournisseursFromHook}
                  onAddFournisseur={createFournisseur}
                  onUpdateFournisseur={updateFournisseurAdapter}
                  onDeleteFournisseur={deleteFournisseurFromHook}
                  onRefreshFournisseurs={refreshFournisseurs}
                />
              );
            case 'entrepots':
              return (hasPermission('manage_users') || hasPermission('view_inventory')) && (
                <Entrepots
                  localisations={localisations}
                  loading={loading}
                  error={error}
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
                  addNotification={addNotification}
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
        })()}
      </React.Suspense>
    );
  };

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
    const renderPublicPage = () => {
      switch (publicView) {
        case 'landing':
          return <LandingPage onLoginClick={() => setPublicView('login')} onNavigate={setPublicView} />;
        case 'pricing':
          return <PricingPage onBack={() => setPublicView('landing')} onLogin={() => setPublicView('login')} />;
        case 'faq':
          return <FAQPage onBack={() => setPublicView('landing')} onLogin={() => setPublicView('login')} />;
        case 'privacy':
          return <PrivacyPage onBack={() => setPublicView('landing')} onLogin={() => setPublicView('login')} />;
        case 'terms':
          return <TermsPage onBack={() => setPublicView('landing')} onLogin={() => setPublicView('login')} />;
        case 'login':
          return (
            <FeedbackProvider>
              <LoginForm onLogin={handleLogin} onForgotPassword={handleForgotPassword} error={loginError} onBack={() => setPublicView('landing')} />
              <NotificationContainer />
            </FeedbackProvider>
          );
        default:
          return <LandingPage onLoginClick={() => setPublicView('login')} onNavigate={setPublicView} />;
      }
    };

    return (
      <>
        {renderPublicPage()}
        {hasCookieConsent === null && (
          <CookieBanner 
            onAccept={handleAcceptCookies} 
            onDecline={handleDeclineCookies} 
            onViewPrivacy={handleViewPrivacy} 
          />
        )}
      </>
    );
  }

  const isMobile = window.innerWidth < 768;

  if (isMobile && useNewUX) {
    return (
      <FeedbackProvider>
        <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-50 overflow-hidden">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform shadow-lg"
              title="Mon profil"
            >
              <span className="text-white font-bold text-sm">
                {currentUserForComponents.prenom.charAt(0)}{currentUserForComponents.nom.charAt(0)}
              </span>
            </button>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {currentUserForComponents.prenom} {currentUserForComponents.nom}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                {currentUserForComponents.role}
              </span>
            </div>
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0 mr-2"
            title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {isDarkMode ? (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          <div className="relative inline-flex items-center justify-center mr-3 flex-shrink-0 pointer-events-none ">
            <span className="relative inline-flex items-center justify-center px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold text-xs tracking-widest text-white shadow-lg shadow-purple-500/50 pointer-events-none overflow-hidden">
              BETA
            </span>
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

        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden max-w-full pt-[72px]">
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
            <div className="px-6 py-6 max-w-full">
              {renderCurrentView()}
            </div>
          </div>

          <MobileBottomNav
            currentView={currentView}
            onViewChange={setCurrentView}
            hasPermission={hasPermission}
            userRole={user?.role}
            alertsCount={getArticlesWithAlerts().length}
          />
        </div>

        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          currentUser={currentUserForComponents}
          onChangePassword={handleChangePassword}
        />
        <NotificationContainer />
        {hasCookieConsent === null && (
          <CookieBanner 
            onAccept={handleAcceptCookies} 
            onDecline={handleDeclineCookies} 
            onViewPrivacy={handleViewPrivacy} 
          />
        )}
      </FeedbackProvider>
    );
  }

  return (
    <FeedbackProvider>
      <Analytics/>
      <Layout
        currentView={currentView}
        onViewChange={setCurrentView}
        alertsCount={getArticlesWithAlerts().length}
        currentUser={currentUserForComponents}
        onLogout={signOut}
        onChangePassword={handleChangePassword}
        hasPermission={hasPermission}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      >
        {renderCurrentView()}
      </Layout>
      <NotificationContainer />
      {hasCookieConsent === null && (
        <CookieBanner 
          onAccept={handleAcceptCookies} 
          onDecline={handleDeclineCookies} 
          onViewPrivacy={handleViewPrivacy} 
        />
      )}
    </FeedbackProvider>
  );
}

export default App;