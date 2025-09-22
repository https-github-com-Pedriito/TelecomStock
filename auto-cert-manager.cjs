const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { networkInterfaces } = require('os');

class AutoCertManager {
  constructor() {
    this.rootPath = process.cwd();
    this.apiPath = path.join(this.rootPath, 'api');
    this.dockerPath = path.join(this.rootPath, 'docker');
  }

  // Détecter l'IP locale principale (non localhost)
  getCurrentIP() {
    const interfaces = networkInterfaces();
    
    // Chercher l'interface Wi-Fi ou Ethernet principale
    for (const name of Object.keys(interfaces)) {
      if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('ethernet')) {
        for (const net of interfaces[name]) {
          // IPv4, non interne, non localhost
          if (net.family === 'IPv4' && !net.internal && net.address !== '127.0.0.1') {
            return net.address;
          }
        }
      }
    }
    
    // Fallback: chercher n'importe quelle IP non localhost
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal && net.address !== '127.0.0.1') {
          return net.address;
        }
      }
    }
    
    return '127.0.0.1'; // Ultime fallback
  }

  // Vérifier si les certificats existent et correspondent à l'IP actuelle
  certificatesExistForIP(ip) {
    const certFile = path.join(this.rootPath, `${ip}.pem`);
    const keyFile = path.join(this.rootPath, `${ip}-key.pem`);
    
    const exists = fs.existsSync(certFile) && fs.existsSync(keyFile);
    
    if (exists) {
      // Vérifier que les certificats ne sont pas expirés (optionnel)
      try {
        const certContent = fs.readFileSync(certFile, 'utf8');
        // Ici on pourrait analyser la date d'expiration, mais mkcert gère déjà cela
        return true;
      } catch (error) {
        console.warn(`⚠️ Certificat ${certFile} illisible:`, error.message);
        return false;
      }
    }
    
    return false;
  }

  // Générer les certificats pour l'IP actuelle
  generateCertificatesForIP(ip) {
    console.log(`🔐 Génération des certificats pour l'IP: ${ip}`);
    
    try {
      // Vérifier que mkcert est installé
      execSync('mkcert -version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('mkcert n\'est pas installé. Installez-le avec: choco install mkcert');
    }

    try {
      // Générer les certificats
      const command = `mkcert ${ip}`;
      console.log(`📜 Exécution: ${command}`);
      
      const output = execSync(command, { 
        cwd: this.rootPath,
        encoding: 'utf8'
      });
      
      console.log(output);

      // Copier dans le dossier API
      const sourceCert = path.join(this.rootPath, `${ip}.pem`);
      const sourceKey = path.join(this.rootPath, `${ip}-key.pem`);
      const destCert = path.join(this.apiPath, `${ip}.pem`);
      const destKey = path.join(this.apiPath, `${ip}-key.pem`);

      // Créer le dossier API si nécessaire
      if (!fs.existsSync(this.apiPath)) {
        fs.mkdirSync(this.apiPath, { recursive: true });
      }

      fs.copyFileSync(sourceCert, destCert);
      fs.copyFileSync(sourceKey, destKey);
      
      console.log(`✅ Certificats copiés dans ${this.apiPath}`);
      
      return { certFile: sourceCert, keyFile: sourceKey, ip };
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération des certificats:', error.message);
      throw error;
    }
  }

  // Nettoyer les anciens certificats (optionnel)
  cleanOldCertificates(currentIP) {
    const files = fs.readdirSync(this.rootPath);
    const certPattern = /^(\d+\.\d+\.\d+\.\d+)\.pem$/;
    const keyPattern = /^(\d+\.\d+\.\d+\.\d+)-key\.pem$/;
    
    let cleaned = 0;
    
    files.forEach(file => {
      const certMatch = file.match(certPattern);
      const keyMatch = file.match(keyPattern);
      
      if (certMatch && certMatch[1] !== currentIP) {
        fs.unlinkSync(path.join(this.rootPath, file));
        console.log(`🗑️ Supprimé ancien certificat: ${file}`);
        cleaned++;
      }
      
      if (keyMatch && keyMatch[1] !== currentIP) {
        fs.unlinkSync(path.join(this.rootPath, file));
        console.log(`🗑️ Supprimé ancienne clé: ${file}`);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`✨ ${cleaned} fichiers de certificats obsolètes supprimés`);
    }
  }

  // Mettre à jour les configurations automatiquement
  updateConfigurations(ip) {
    console.log(`⚙️ Mise à jour des configurations pour l'IP: ${ip}`);
    
    // 1. Mettre à jour vite.config.ts
    this.updateViteConfig(ip);
    
    // 2. Mettre à jour vite.config.hybrid.ts
    this.updateViteHybridConfig(ip);
    
    // 3. Mettre à jour docker-compose.yml
    this.updateDockerCompose(ip);
  }

  updateViteConfig(ip) {
    const configPath = path.join(this.rootPath, 'vite.config.ts');
    if (!fs.existsSync(configPath)) return;

    let config = fs.readFileSync(configPath, 'utf8');
    
    // Remplacer la configuration des certificats
    const certRegex = /const certPath = '\.\/[\d.]+\.pem';/;
    const keyRegex = /const keyPath = '\.\/[\d.]+-key\.pem';/;
    
    config = config.replace(certRegex, `const certPath = './${ip}.pem';`);
    config = config.replace(keyRegex, `const keyPath = './${ip}-key.pem';`);
    
    // Remplacer les URLs de l'API
    const apiUrlRegex = /"https:\/\/[\d.]+:3443"/g;
    config = config.replace(apiUrlRegex, `"https://${ip}:3443"`);
    
    fs.writeFileSync(configPath, config);
    console.log(`✅ vite.config.ts mis à jour`);
  }

  updateViteHybridConfig(ip) {
    const configPath = path.join(this.rootPath, 'vite.config.hybrid.ts');
    if (!fs.existsSync(configPath)) return;

    let config = fs.readFileSync(configPath, 'utf8');
    
    // Remplacer les certificats
    const keyRegex = /key: fs\.readFileSync\('[\d.]+-key\.pem'\)/;
    const certRegex = /cert: fs\.readFileSync\('[\d.]+\.pem'\)/;
    
    config = config.replace(keyRegex, `key: fs.readFileSync('${ip}-key.pem')`);
    config = config.replace(certRegex, `cert: fs.readFileSync('${ip}.pem')`);
    
    // Remplacer les URLs de l'API
    const apiUrlRegex = /"https:\/\/[\d.]+:3443"/g;
    config = config.replace(apiUrlRegex, `"https://${ip}:3443"`);
    
    fs.writeFileSync(configPath, config);
    console.log(`✅ vite.config.hybrid.ts mis à jour`);
  }

  updateDockerCompose(ip) {
    const composePath = path.join(this.dockerPath, 'docker-compose.yml');
    if (!fs.existsSync(composePath)) return;

    let compose = fs.readFileSync(composePath, 'utf8');
    
    // Remplacer les chemins des certificats
    const sslKeyRegex = /SSL_KEY=\/usr\/src\/app\/[\d.]+-key\.pem/;
    const sslCertRegex = /SSL_CERT=\/usr\/src\/app\/[\d.]+\.pem/;
    
    compose = compose.replace(sslKeyRegex, `SSL_KEY=/usr/src/app/${ip}-key.pem`);
    compose = compose.replace(sslCertRegex, `SSL_CERT=/usr/src/app/${ip}.pem`);
    
    // Remplacer les volumes
    const volumeKeyRegex = /- \.\.\/[\d.]+-key\.pem:\/usr\/src\/app\/[\d.]+-key\.pem:ro/;
    const volumeCertRegex = /- \.\.\/[\d.]+\.pem:\/usr\/src\/app\/[\d.]+\.pem:ro/;
    
    compose = compose.replace(volumeKeyRegex, `- ../${ip}-key.pem:/usr/src/app/${ip}-key.pem:ro`);
    compose = compose.replace(volumeCertRegex, `- ../${ip}.pem:/usr/src/app/${ip}.pem:ro`);
    
    fs.writeFileSync(composePath, compose);
    console.log(`✅ docker-compose.yml mis à jour`);
  }

  // Fonction principale d'auto-configuration
  autoSetup() {
    console.log('🚀 Auto-configuration des certificats SSL...');
    
    const currentIP = this.getCurrentIP();
    console.log(`🌐 IP détectée: ${currentIP}`);
    
    // Vérifier si les certificats existent déjà
    if (!this.certificatesExistForIP(currentIP)) {
      console.log('📜 Certificats manquants, génération en cours...');
      this.generateCertificatesForIP(currentIP);
    } else {
      console.log('✅ Certificats existants pour cette IP');
    }
    
    // Mettre à jour les configurations
    this.updateConfigurations(currentIP);
    
    // Nettoyer les anciens certificats
    this.cleanOldCertificates(currentIP);
    
    console.log(`🎉 Configuration automatique terminée pour l'IP: ${currentIP}`);
    console.log(`📍 Frontend: https://${currentIP}:5173/`);
    console.log(`📍 API: https://${currentIP}:3443/`);
    
    return currentIP;
  }
}

// Script exécutable
if (require.main === module) {
  const manager = new AutoCertManager();
  
  const command = process.argv[2] || 'auto';
  
  switch (command) {
    case 'auto':
    case 'setup':
      manager.autoSetup();
      break;
      
    case 'ip':
      console.log(manager.getCurrentIP());
      break;
      
    case 'check':
      const ip = manager.getCurrentIP();
      console.log(`IP actuelle: ${ip}`);
      console.log(`Certificats existent: ${manager.certificatesExistForIP(ip)}`);
      break;
      
    default:
      console.log('Usage: node auto-cert-manager.cjs [auto|ip|check]');
      console.log('  auto  - Configuration automatique complète');
      console.log('  ip    - Afficher l\'IP actuelle');
      console.log('  check - Vérifier l\'état des certificats');
  }
}

module.exports = AutoCertManager;