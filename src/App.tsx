import React, { useState } from 'react';
import { ViewMode } from './types';
import { useStock } from './hooks/useStock';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './pages/Dashboard';
import { Articles } from './pages/Articles';
import { Mouvements } from './pages/Mouvements';
import { Scanner } from './pages/Scanner';
import { Historique } from './pages/Historique';
import { Fournisseurs } from './pages/Fournisseurs';
import { Utilisateurs } from './pages/Utilisateurs';
import { Rapports } from './pages/Rapports';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [loginError, setLoginError] = useState<string>('');
  
  const {
    articles,
    mouvements,
    fournisseurs,
    addArticle,
    updateArticle,
    deleteArticle,
    addMouvement,
    addFournisseur,
    updateFournisseur,
    deleteFournisseur,
    getArticleByCodeBarres,
    getArticlesWithAlerts,
    getMouvementsWithArticles,
  } = useStock();

  const {
    users,
    currentUser,
    isAuthenticated,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    hasPermission,
  } = useAuth();

  const alertsCount = getArticlesWithAlerts().length;
  const mouvementsWithArticles = getMouvementsWithArticles();

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoginError('');
      await login(email, password);
      // Rediriger vers la première page autorisée
      if (hasPermission('view_dashboard')) {
        setCurrentView('dashboard');
      } else if (hasPermission('use_scanner')) {
        setCurrentView('scanner');
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Erreur de connexion');
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentView('dashboard');
    setLoginError('');
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
      default:
        return false;
    }
  };

  // Rediriger si l'utilisateur n'a pas accès à la vue actuelle
  React.useEffect(() => {
    if (isAuthenticated && !canAccessCurrentView()) {
      if (hasPermission('view_dashboard')) {
        setCurrentView('dashboard');
      } else if (hasPermission('use_scanner')) {
        setCurrentView('scanner');
      }
    }
  }, [currentView, isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} error={loginError} />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return hasPermission('view_dashboard') ? (
          <Dashboard
            articles={articles}
            mouvements={mouvementsWithArticles}
            articlesWithAlerts={getArticlesWithAlerts()}
          />
        ) : null;
      case 'articles':
        return hasPermission('view_articles') ? (
          <Articles
            articles={articles}
            hasPermission={hasPermission}
            fournisseurs={fournisseurs}
            onAddArticle={addArticle}
            onUpdateArticle={updateArticle}
            onDeleteArticle={deleteArticle}
          />
        ) : null;
      case 'mouvements':
        return hasPermission('view_mouvements') ? (
          <Mouvements
            articles={articles}
            onAddMouvement={addMouvement}
            getArticleByCodeBarres={getArticleByCodeBarres}
          />
        ) : null;
      case 'scanner':
        return hasPermission('use_scanner') ? (
          <Scanner
            articles={articles}
            getArticleByCodeBarres={getArticleByCodeBarres}
            onAddMouvement={addMouvement}
          />
        ) : null;
      case 'historique':
        return hasPermission('view_historique') ? (
          <Historique
            mouvements={mouvementsWithArticles}
            articles={articles}
          />
        ) : null;
      case 'fournisseurs':
        return hasPermission('manage_users') ? (
          <Fournisseurs
            fournisseurs={fournisseurs}
            onAddFournisseur={addFournisseur}
            onUpdateFournisseur={updateFournisseur}
            onDeleteFournisseur={deleteFournisseur}
          />
        ) : null;
      case 'utilisateurs':
        return hasPermission('manage_users') ? (
          <Utilisateurs
            users={users}
            currentUser={currentUser!}
            onAddUser={addUser}
            onUpdateUser={updateUser}
            onDeleteUser={deleteUser}
          />
        ) : null;
      case 'rapports':
        return hasPermission('manage_users') ? (
          <Rapports
            articles={articles}
            mouvements={mouvementsWithArticles}
            articlesWithAlerts={getArticlesWithAlerts()}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Layout
      currentView={currentView}
      onViewChange={setCurrentView}
      alertsCount={alertsCount}
      currentUser={currentUser!}
      onLogout={handleLogout}
      hasPermission={hasPermission}
    >
      {renderCurrentView()}
    </Layout>
  );
}

export default App;