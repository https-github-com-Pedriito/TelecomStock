const CertificateManager = require('./cert-manager.cjs');

class CertificateWatchService {
  constructor(options = {}) {
    this.manager = new CertificateManager();
    this.interval = (options.checkIntervalHours || 24) * 60 * 60 * 1000;
    this.isRunning = false;
    this.checkTimer = null;
  }

  start() {
    if (this.isRunning) {
      console.log('📊 Service de surveillance déjà en cours');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Démarrage du service de surveillance des certificats');
    
    // Vérification initiale
    this.performCheck();
    
    // Programmer les vérifications périodiques
    this.scheduleNextCheck();
    
    // Gérer l'arrêt propre
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  stop() {
    if (!this.isRunning) return;
    
    console.log('🛑 Arrêt du service de surveillance');
    this.isRunning = false;
    
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }
    
    process.exit(0);
  }

  scheduleNextCheck() {
    if (!this.isRunning) return;
    
    this.checkTimer = setTimeout(() => {
      this.performCheck();
      this.scheduleNextCheck();
    }, this.interval);
    
    const nextCheck = new Date(Date.now() + this.interval);
    console.log(`⏰ Prochaine vérification programmée à: ${nextCheck.toLocaleString()}`);
  }

  performCheck() {
    try {
      console.log('🔍 Vérification automatique des certificats...');
      const result = this.manager.renewIfNeeded();
      
      if (result.renewed) {
        console.log('✅ Certificats renouvelés automatiquement !');
        this.notifyRenewal(result);
      } else {
        console.log('✅ Certificats valides');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification:', error.message);
    }
  }

  notifyRenewal(result) {
    // Ici vous pourriez ajouter des notifications (email, webhook, etc.)
    console.log(`📧 Notification: Certificats renouvelés (raison: ${result.reason})`);
    
    // Exemple: redémarrer automatiquement les services si nécessaire
    // this.restartServices();
  }

  // Méthode pour redémarrer les services (optionnel)
  restartServices() {
    console.log('🔄 Redémarrage des services recommandé après renouvellement des certificats');
    // Implémentation selon vos besoins
  }
}

// Si exécuté directement
if (require.main === module) {
  const args = process.argv.slice(2);
  const intervalHours = parseInt(args[0]) || 24;
  
  const service = new CertificateWatchService({ checkIntervalHours: intervalHours });
  service.start();
  
  console.log(`📊 Service de surveillance actif (vérification toutes les ${intervalHours}h)`);
  console.log('Press Ctrl+C to stop');
}

module.exports = CertificateWatchService;
