const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CertificateManager {
  constructor() {
    this.certDir = './';
    this.apiCertDir = './api/';
    this.ipAddress = '192.168.1.53';
    this.domains = ['localhost', '127.0.0.1', this.ipAddress];
    this.certFiles = {
      cert: `${this.ipAddress}+2.pem`,
      key: `${this.ipAddress}+2-key.pem`
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔧',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type];
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  checkCertificateExpiry() {
    try {
      const certPath = path.join(this.certDir, this.certFiles.cert);
      
      if (!fs.existsSync(certPath)) {
        this.log('Certificat non trouvé, génération nécessaire', 'warning');
        return { needsRenewal: true, reason: 'missing' };
      }

      // Vérifier la date d'expiration avec openssl (si disponible)
      try {
        const result = execSync(`openssl x509 -in "${certPath}" -noout -enddate`, { encoding: 'utf8' });
        const endDateMatch = result.match(/notAfter=(.+)/);
        
        if (endDateMatch) {
          const endDate = new Date(endDateMatch[1]);
          const now = new Date();
          const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
          
          this.log(`Certificat expire dans ${daysUntilExpiry} jours`);
          
          // Renouveler si expire dans moins de 30 jours
          if (daysUntilExpiry < 30) {
            return { needsRenewal: true, reason: 'expiring', daysLeft: daysUntilExpiry };
          }
          
          return { needsRenewal: false, daysLeft: daysUntilExpiry };
        }
      } catch (opensslError) {
        // Si openssl n'est pas disponible, vérifier par la date de modification du fichier
        const stats = fs.statSync(certPath);
        const fileAge = Math.ceil((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
        
        this.log(`OpenSSL non disponible, vérification par âge du fichier: ${fileAge} jours`);
        
        // Renouveler si le fichier a plus de 335 jours (30 jours avant expiration typique de 365 jours)
        if (fileAge > 335) {
          return { needsRenewal: true, reason: 'old-file', fileAge };
        }
        
        return { needsRenewal: false, fileAge };
      }
    } catch (error) {
      this.log(`Erreur lors de la vérification du certificat: ${error.message}`, 'error');
      return { needsRenewal: true, reason: 'error' };
    }
  }

  generateCertificate() {
    try {
      this.log('Génération d\'un nouveau certificat...');
      
      // Supprimer les anciens certificats
      this.cleanupOldCertificates();
      
      // Générer avec mkcert
      const domainsStr = this.domains.join(' ');
      execSync(`mkcert ${domainsStr}`, { stdio: 'inherit' });
      
      // Copier vers le dossier API
      this.copyCertificatesToApi();
      
      this.log('Certificat généré avec succès !', 'success');
      return true;
      
    } catch (error) {
      this.log(`Erreur lors de la génération: ${error.message}`, 'error');
      return false;
    }
  }

  cleanupOldCertificates() {
    const patterns = [
      `${this.ipAddress}+*.pem`,
      'localhost+*.pem'
    ];
    
    patterns.forEach(pattern => {
      try {
        // Simple cleanup - supprimer les fichiers existants
        const files = fs.readdirSync(this.certDir).filter(file => 
          file.includes(this.ipAddress) && file.endsWith('.pem')
        );
        
        files.forEach(file => {
          const filePath = path.join(this.certDir, file);
          fs.unlinkSync(filePath);
          this.log(`Ancien certificat supprimé: ${file}`);
        });
      } catch (error) {
        this.log(`Erreur lors du nettoyage: ${error.message}`, 'warning');
      }
    });
  }

  copyCertificatesToApi() {
    try {
      if (!fs.existsSync(this.apiCertDir)) {
        fs.mkdirSync(this.apiCertDir, { recursive: true });
      }

      const certPath = path.join(this.certDir, this.certFiles.cert);
      const keyPath = path.join(this.certDir, this.certFiles.key);
      
      if (fs.existsSync(certPath)) {
        fs.copyFileSync(certPath, path.join(this.apiCertDir, this.certFiles.cert));
        this.log('Certificat copié vers API');
      }
      
      if (fs.existsSync(keyPath)) {
        fs.copyFileSync(keyPath, path.join(this.apiCertDir, this.certFiles.key));
        this.log('Clé privée copiée vers API');
      }
      
    } catch (error) {
      this.log(`Erreur lors de la copie vers API: ${error.message}`, 'warning');
    }
  }

  renewIfNeeded() {
    this.log('Vérification du statut des certificats...');
    
    const status = this.checkCertificateExpiry();
    
    if (status.needsRenewal) {
      this.log(`Renouvellement nécessaire: ${status.reason}`, 'warning');
      
      if (this.generateCertificate()) {
        this.log('Certificat renouvelé automatiquement !', 'success');
        return { renewed: true, reason: status.reason };
      } else {
        this.log('Échec du renouvellement automatique', 'error');
        return { renewed: false, error: 'generation_failed' };
      }
    } else {
      this.log(`Certificat valide (${status.daysLeft || status.fileAge} jours restants)`, 'success');
      return { renewed: false, status: 'valid' };
    }
  }

  // Démarrer la surveillance automatique
  startAutoRenewal(intervalHours = 24) {
    this.log(`Démarrage de la surveillance automatique (vérification toutes les ${intervalHours}h)`);
    
    // Vérification initiale
    this.renewIfNeeded();
    
    // Planifier les vérifications périodiques
    setInterval(() => {
      this.log('Vérification programmée des certificats...');
      this.renewIfNeeded();
    }, intervalHours * 60 * 60 * 1000);
  }
}

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CertificateManager;
}

// Exécution directe si appelé en script
if (require.main === module) {
  const manager = new CertificateManager();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'check';
  
  switch (command) {
    case 'check':
      manager.renewIfNeeded();
      break;
      
    case 'generate':
      manager.generateCertificate();
      break;
      
    case 'watch':
      const hours = parseInt(args[1]) || 24;
      manager.startAutoRenewal(hours);
      // Garder le processus vivant
      process.stdin.resume();
      break;
      
    default:
      console.log('Usage:');
      console.log('  node cert-manager.js check    - Vérifier et renouveler si nécessaire');
      console.log('  node cert-manager.js generate - Forcer la génération');
      console.log('  node cert-manager.js watch [hours] - Surveiller en continu');
  }
}
