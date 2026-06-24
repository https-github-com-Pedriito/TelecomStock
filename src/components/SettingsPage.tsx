import { useState, useEffect } from 'react';
import { 
  Settings, 
  Bell, 
  Database, 
  Shield, 
  Monitor, 
  Smartphone,
  Save, 
  RotateCcw, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { useFeedback } from './UXFeedback';

interface SettingsPageProps {
  onSave?: (settings: SystemSettings) => Promise<void>;
  initialSettings?: Partial<SystemSettings>;
}

interface SystemSettings {
  // Alertes et seuils
  defaultStockThreshold: number;
  criticalStockThreshold: number;
  enableLowStockAlerts: boolean;
  enableCriticalStockAlerts: boolean;
  alertCheckInterval: number; // en minutes
  
  // Notifications
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  adminEmail: string;
  notificationHours: {
    start: string;
    end: string;
  };
  
  // Interface
  defaultView: 'mobile' | 'desktop' | 'auto';
  theme: 'light' | 'dark' | 'auto';
  language: 'fr' | 'en';
  enableMobileOptimizations: boolean;
  
  // Sécurité
  sessionTimeout: number; // en minutes
  requirePasswordChange: number; // en jours
  enableTwoFactor: boolean;
  allowMultipleSessions: boolean;
  
  // Base de données
  enableAutoBackup: boolean;
  backupInterval: number; // en heures
  retentionPeriod: number; // en jours
  enableDataCompression: boolean;
  
  // Fonctionnalités
  enableBarcodeScan: boolean;
  enableOfflineMode: boolean;
  enableBulkOperations: boolean;
  enableAdvancedReporting: boolean;
}

export function SettingsPage({ onSave, initialSettings }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'data'>('general');
  const [settings, setSettings] = useState<SystemSettings>({
    defaultStockThreshold: 10,
    criticalStockThreshold: 5,
    enableLowStockAlerts: true,
    enableCriticalStockAlerts: true,
    alertCheckInterval: 60,
    enableEmailNotifications: true,
    enablePushNotifications: false,
    adminEmail: '',
    notificationHours: {
      start: '08:00',
      end: '18:00'
    },
    defaultView: 'auto',
    theme: 'light',
    language: 'fr',
    enableMobileOptimizations: true,
    sessionTimeout: 120,
    requirePasswordChange: 90,
    enableTwoFactor: false,
    allowMultipleSessions: true,
    enableAutoBackup: true,
    backupInterval: 24,
    retentionPeriod: 30,
    enableDataCompression: true,
    enableBarcodeScan: true,
    enableOfflineMode: true,
    enableBulkOperations: true,
    enableAdvancedReporting: false,
    ...initialSettings
  });
  
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const { showFeedback } = useFeedback();

  useEffect(() => {
    setHasChanges(true);
  }, [settings]);

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.(settings);
      setHasChanges(false);
      showFeedback({
        type: 'success',
        title: 'Configuration sauvegardée',
        message: 'Les paramètres ont été mis à jour avec succès'
      });
    } catch (error) {
      showFeedback({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder la configuration'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      ...initialSettings,
      defaultStockThreshold: 10,
      criticalStockThreshold: 5,
      enableLowStockAlerts: true,
      enableCriticalStockAlerts: true,
      alertCheckInterval: 60,
      enableEmailNotifications: true,
      enablePushNotifications: false,
      adminEmail: '',
      notificationHours: {
        start: '08:00',
        end: '18:00'
      },
      defaultView: 'auto',
      theme: 'light',
      language: 'fr',
      enableMobileOptimizations: true,
      sessionTimeout: 120,
      requirePasswordChange: 90,
      enableTwoFactor: false,
      allowMultipleSessions: true,
      enableAutoBackup: true,
      backupInterval: 24,
      retentionPeriod: 30,
      enableDataCompression: true,
      enableBarcodeScan: true,
      enableOfflineMode: true,
      enableBulkOperations: true,
      enableAdvancedReporting: false
    } as SystemSettings);
    setHasChanges(false);
  };

  const tabs = [
    { id: 'general', name: 'Général', icon: Settings },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Sécurité', icon: Shield },
    { id: 'data', name: 'Données', icon: Database }
  ];

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Configuration Système
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gérer les paramètres et utilisateurs de l'application
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-gray-900 dark:text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Réinitialiser</span>
            </button>
            
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
            </button>
          </div>
        </div>
        
        {hasChanges && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2" />
            <span className="text-sm text-yellow-800 dark:text-yellow-300">
              Vous avez des modifications non sauvegardées
            </span>
          </div>
        )}
      </div>

      <div className="flex h-full">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Onglet Général */}
            {activeTab === 'general' && (
              <div className="space-y-8">
                {/* Seuils de Stock */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Gestion des Stocks
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Seuil d'alerte par défaut
                      </label>
                      <input
                        type="number"
                        value={settings.defaultStockThreshold}
                        onChange={(e) => handleSettingChange('defaultStockThreshold', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Quantité en dessous de laquelle une alerte est générée
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Seuil critique
                      </label>
                      <input
                        type="number"
                        value={settings.criticalStockThreshold}
                        onChange={(e) => handleSettingChange('criticalStockThreshold', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Seuil pour les alertes critiques (stock très faible)
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enableLowStockAlerts"
                        checked={settings.enableLowStockAlerts}
                        onChange={(e) => handleSettingChange('enableLowStockAlerts', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label htmlFor="enableLowStockAlerts" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Activer les alertes de stock faible
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enableCriticalStockAlerts"
                        checked={settings.enableCriticalStockAlerts}
                        onChange={(e) => handleSettingChange('enableCriticalStockAlerts', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label htmlFor="enableCriticalStockAlerts" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Activer les alertes critiques
                      </label>
                    </div>
                  </div>
                </div>

                {/* Interface */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Interface Utilisateur
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Vue par défaut
                      </label>
                      <select
                        value={settings.defaultView}
                        onChange={(e) => handleSettingChange('defaultView', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="auto">Automatique</option>
                        <option value="mobile">Mobile</option>
                        <option value="desktop">Desktop</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Thème
                      </label>
                      <select
                        value={settings.theme}
                        onChange={(e) => handleSettingChange('theme', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="light">Clair</option>
                        <option value="dark">Sombre</option>
                        <option value="auto">Système</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enableMobileOptimizations"
                        checked={settings.enableMobileOptimizations}
                        onChange={(e) => handleSettingChange('enableMobileOptimizations', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label htmlFor="enableMobileOptimizations" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Optimisations mobile (navigation tactile, boutons plus grands)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Fonctionnalités */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Fonctionnalités
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enableBarcodeScan"
                          checked={settings.enableBarcodeScan}
                          onChange={(e) => handleSettingChange('enableBarcodeScan', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <label htmlFor="enableBarcodeScan" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Scanner de codes-barres
                        </label>
                      </div>
                      <Smartphone className="h-4 w-4 text-gray-400" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enableOfflineMode"
                          checked={settings.enableOfflineMode}
                          onChange={(e) => handleSettingChange('enableOfflineMode', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <label htmlFor="enableOfflineMode" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Mode hors-ligne
                        </label>
                      </div>
                      <Monitor className="h-4 w-4 text-gray-400" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enableBulkOperations"
                          checked={settings.enableBulkOperations}
                          onChange={(e) => handleSettingChange('enableBulkOperations', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <label htmlFor="enableBulkOperations" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Opérations en lot
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enableAdvancedReporting"
                          checked={settings.enableAdvancedReporting}
                          onChange={(e) => handleSettingChange('enableAdvancedReporting', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <label htmlFor="enableAdvancedReporting" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Rapports avancés
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}



            {/* Onglet Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Paramètres de Notification
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email administrateur
                      </label>
                      <input
                        type="email"
                        value={settings.adminEmail}
                        onChange={(e) => handleSettingChange('adminEmail', e.target.value)}
                        placeholder="admin@telecomstock.com"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Heure de début
                        </label>
                        <input
                          type="time"
                          value={settings.notificationHours.start}
                          onChange={(e) => handleSettingChange('notificationHours', {
                            ...settings.notificationHours,
                            start: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Heure de fin
                        </label>
                        <input
                          type="time"
                          value={settings.notificationHours.end}
                          onChange={(e) => handleSettingChange('notificationHours', {
                            ...settings.notificationHours,
                            end: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enableEmailNotifications"
                          checked={settings.enableEmailNotifications}
                          onChange={(e) => handleSettingChange('enableEmailNotifications', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <label htmlFor="enableEmailNotifications" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Notifications par email
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enablePushNotifications"
                          checked={settings.enablePushNotifications}
                          onChange={(e) => handleSettingChange('enablePushNotifications', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <label htmlFor="enablePushNotifications" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Notifications push (navigateur)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Onglet Sécurité */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Paramètres de Sécurité
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timeout de session (minutes)
                      </label>
                      <input
                        type="number"
                        value={settings.sessionTimeout}
                        onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="5"
                        max="480"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Changement de mot de passe requis (jours)
                      </label>
                      <input
                        type="number"
                        value={settings.requirePasswordChange}
                        onChange={(e) => handleSettingChange('requirePasswordChange', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="30"
                        max="365"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enableTwoFactor"
                          checked={settings.enableTwoFactor}
                          onChange={(e) => handleSettingChange('enableTwoFactor', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="enableTwoFactor" className="ml-2 text-sm text-gray-700">
                          Authentification à deux facteurs
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="allowMultipleSessions"
                          checked={settings.allowMultipleSessions}
                          onChange={(e) => handleSettingChange('allowMultipleSessions', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="allowMultipleSessions" className="ml-2 text-sm text-gray-700">
                          Autoriser les sessions multiples
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Onglet Données */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Gestion des Données
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Intervalle de sauvegarde (heures)
                        </label>
                        <input
                          type="number"
                          value={settings.backupInterval}
                          onChange={(e) => handleSettingChange('backupInterval', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="1"
                          max="168"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rétention des données (jours)
                        </label>
                        <input
                          type="number"
                          value={settings.retentionPeriod}
                          onChange={(e) => handleSettingChange('retentionPeriod', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="7"
                          max="3650"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enableAutoBackup"
                          checked={settings.enableAutoBackup}
                          onChange={(e) => handleSettingChange('enableAutoBackup', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="enableAutoBackup" className="ml-2 text-sm text-gray-700">
                          Sauvegarde automatique
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enableDataCompression"
                          checked={settings.enableDataCompression}
                          onChange={(e) => handleSettingChange('enableDataCompression', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="enableDataCompression" className="ml-2 text-sm text-gray-700">
                          Compression des données
                        </label>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <Info className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium mb-1">Information importante</p>
                          <p>
                            Les modifications des paramètres de sauvegarde prennent effet 
                            immédiatement. Assurez-vous d'avoir suffisamment d'espace disque.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
