const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { networkInterfaces } = require('os');
const EnvironmentDetector = require('./environment-detector.cjs');

class AutoCertManager {
  constructor() {
    this.rootPath = process.cwd();
    this.apiPath = path.join(this.rootPath, 'api');
    this.dockerPath = path.join(this.rootPath, 'docker');
    this.detector = new EnvironmentDetector();
  }

  // Détecter l'IP locale principale (non localhost)
  getCurrentIP() {
    const interfaces = networkInterfaces();
    
    // PRIORITÉ À L'INTERFACE WI-FI pour le mobile
    for (const name of Object.keys(interfaces)) {
      if (name.toLowerCase().includes('wi-fi')) {
        for (const net of interfaces[name]) {
          // IPv4, non interne, non localhost
          if (net.family === 'IPv4' && !net.internal && net.address !== '127.0.0.1') {
            console.log(`🔥 IP Wi-Fi prioritaire détectée: ${net.address}`);
            return net.address;
          }
        }
      }
    }
    
    // Fallback: interface Ethernet ou autres
    for (const name of Object.keys(interfaces)) {
      if (name.toLowerCase().includes('ethernet')) {
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

  // Détecter TOUTES les IPs utilisables (pour certificats multiples)
  getAllUsableIPs() {
    const interfaces = networkInterfaces();
    const ips = new Set();
    
    // Ajouter localhost pour les tests locaux
    ips.add('127.0.0.1');
    ips.add('localhost');
    
    // Parcourir toutes les interfaces réseau
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        // IPv4 non interne
        if (net.family === 'IPv4' && !net.internal && net.address !== '127.0.0.1') {
          ips.add(net.address);
          console.log(`🌐 Interface ${name}: ${net.address}`);
        }
      }
    }
    
    return Array.from(ips);
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

  // Générer les certificats pour une ou plusieurs IPs
  generateCertificatesForIPs(ips) {
    console.log(`🔐 Génération des certificats pour les IPs: ${ips.join(', ')}`);
    
    try {
      // Vérifier que mkcert est installé
      execSync('mkcert -version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('mkcert n\'est pas installé. Installez-le avec: choco install mkcert');
    }

    try {
      // Générer un certificat multi-domaines avec toutes les IPs
      const command = `mkcert ${ips.join(' ')}`;
      console.log(`📜 Exécution: ${command}`);
      
      const output = execSync(command, { 
        cwd: this.rootPath,
        encoding: 'utf8'
      });
      
      console.log(output);

      // Déterminer les fichiers générés: mkcert peut suffixer "+N"
      const primaryIP = ips[0];
      const resolveBaseForIP = (ip) => {
        const files = fs.readdirSync(this.rootPath);
        const candidates = files
          .map(f => ({ f, m: f.match(new RegExp(`^${ip.replace(/\./g, '\\.')}(?:\\+\\d+)?(-key)?\\.pem$`)) }))
          .filter(x => x.m);
        // Regrouper par base (sans -key)
        const groups = new Map();
        for (const { f } of candidates) {
          const base = f.replace(/(-key)?\.pem$/, '').replace(/\.pem$/, '');
          const pairKey = base.replace(/-key$/, '');
          const arr = groups.get(pairKey) || [];
          arr.push(f);
          groups.set(pairKey, arr);
        }
        // Choisir la paire la plus récente qui contient .pem et -key.pem
        let best = null;
        for (const [base, arr] of groups.entries()) {
          const hasCert = arr.some(n => n.endsWith('.pem') && !n.includes('-key'));
          const hasKey = arr.some(n => n.endsWith('-key.pem'));
          if (hasCert && hasKey) {
            const certPath = path.join(this.rootPath, `${base}.pem`);
            const keyPath = path.join(this.rootPath, `${base}-key.pem`);
            const mtime = fs.statSync(certPath).mtimeMs;
            if (!best || mtime > best.mtime) best = { base, certPath, keyPath, mtime };
          }
        }
        return best; // { base, certPath, keyPath }
      };

      const found = resolveBaseForIP(primaryIP);
      const sourceCert = found ? found.certPath : path.join(this.rootPath, `${primaryIP}.pem`);
      const sourceKey = found ? found.keyPath : path.join(this.rootPath, `${primaryIP}-key.pem`);
      if (!fs.existsSync(sourceCert) || !fs.existsSync(sourceKey)) {
        throw new Error(`Certificat généré introuvable pour ${primaryIP} (cherché: ${sourceCert}, ${sourceKey})`);
      }

      // Créer des copies pour chaque IP (fichiers stables sans suffixe +N)
      ips.forEach(ip => {
        if (ip === 'localhost' || ip === '127.0.0.1') return; // Ignorer localhost

        const destCert = path.join(this.rootPath, `${ip}.pem`);
        const destKey = path.join(this.rootPath, `${ip}-key.pem`);
        fs.copyFileSync(sourceCert, destCert);
        fs.copyFileSync(sourceKey, destKey);
        console.log(`🔄 Certificat copié pour ${ip}`);

        // Copier dans le dossier API
        const apiCert = path.join(this.apiPath, `${ip}.pem`);
        const apiKey = path.join(this.apiPath, `${ip}-key.pem`);
        
        if (!fs.existsSync(this.apiPath)) {
          fs.mkdirSync(this.apiPath, { recursive: true });
        }
        fs.copyFileSync(destCert, apiCert);
        fs.copyFileSync(destKey, apiKey);
        console.log(`✅ Certificat ${ip} copié dans API`);
      });
      
      return { primaryIP, ips };
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération des certificats:', error.message);
      throw error;
    }
  }

  // Vérifier si des certificats valides existent pour au moins une des IPs
  certificatesExistForAnyIP(ips) {
    for (const ip of ips) {
      if (ip === 'localhost' || ip === '127.0.0.1') continue; // Ignorer localhost
      
      if (this.certificatesExistForIP(ip)) {
        console.log(`✅ Certificats trouvés pour ${ip}`);
        return true;
      }
    }
    return false;
  }
  // Nettoyer les anciens certificats (optionnel)
  cleanOldCertificates(validIPs) {
    const files = fs.readdirSync(this.rootPath);
    const certPattern = /^(\d+\.\d+\.\d+\.\d+)\.pem$/;
    const keyPattern = /^(\d+\.\d+\.\d+\.\d+)-key\.pem$/;
    
    let cleaned = 0;
    
    files.forEach(file => {
      const certMatch = file.match(certPattern);
      const keyMatch = file.match(keyPattern);
      
      if (certMatch && !validIPs.includes(certMatch[1])) {
        fs.unlinkSync(path.join(this.rootPath, file));
        console.log(`🗑️ Supprimé ancien certificat: ${file}`);
        cleaned++;
      }
      
      if (keyMatch && !validIPs.includes(keyMatch[1])) {
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

  // Nginx utilise désormais des chemins stables montés depuis docker/nginx/certs
  // Pas de remplacement nécessaire dans compose pour nginx.
    
    fs.writeFileSync(composePath, compose);
    console.log(`✅ docker-compose.yml mis à jour`);

    // Mettre à jour la conf Nginx (server_name)
    this.updateNginxConfig(ip);
    this.syncNginxCerts(ip);
  }

  updateNginxConfig(ip) {
    const nginxConfPath = path.join(this.dockerPath, 'nginx', 'conf.d', 'default.conf');
    if (!fs.existsSync(nginxConfPath)) {
      console.warn('⚠️ Fichier Nginx default.conf introuvable, skip update');
      return;
    }

    let conf = fs.readFileSync(nginxConfPath, 'utf8');
    // Remplacer toute IP de type 192.168.x.x ou 172.x.x.x dans server_name par la nouvelle IP
    conf = conf.replace(/(server_name[^;]*)(\b(?:\d{1,3}\.){3}\d{1,3})/g, (m, prefix) => `${prefix} ${ip}`);
    // S'assurer que localhost et 127.0.0.1 restent présents
    conf = conf.replace(/server_name\s+([^;]+);/g, (m, names) => {
      const set = new Set(names.split(/\s+/).filter(Boolean));
      set.add('localhost');
      set.add('127.0.0.1');
      set.add(ip);
      return `server_name ${Array.from(set).join(' ')};`;
    });

    fs.writeFileSync(nginxConfPath, conf);
    console.log('✅ Nginx default.conf mis à jour (server_name)');
  }

  syncNginxCerts(ip) {
    // Utiliser les fichiers stables (copiés après génération)
    let srcCert = path.join(this.rootPath, `${ip}.pem`);
    let srcKey = path.join(this.rootPath, `${ip}-key.pem`);
    if (!fs.existsSync(srcCert) || !fs.existsSync(srcKey)) {
      // fallback vers la version avec suffixe +N si nécessaire
      const files = fs.readdirSync(this.rootPath);
      const cert = files.find(f => f.match(new RegExp(`^${ip.replace(/\./g, '\\.')}(?:\\+\\d+)?\\.pem$`)) && !f.includes('-key'));
      const key = files.find(f => f.match(new RegExp(`^${ip.replace(/\./g, '\\.')}(?:\\+\\d+)?-key\\.pem$`)));
      if (cert && key) {
        srcCert = path.join(this.rootPath, cert);
        srcKey = path.join(this.rootPath, key);
      }
    }
    const nginxCertDir = path.join(this.dockerPath, 'nginx', 'certs');
    const destCert = path.join(nginxCertDir, 'fullchain.pem');
    const destKey = path.join(nginxCertDir, 'privkey.pem');

    if (!fs.existsSync(srcCert) || !fs.existsSync(srcKey)) {
      console.warn('⚠️ Certificats source introuvables pour la sync Nginx');
      return;
    }
    if (!fs.existsSync(nginxCertDir)) {
      fs.mkdirSync(nginxCertDir, { recursive: true });
    }
    fs.copyFileSync(srcCert, destCert);
    fs.copyFileSync(srcKey, destKey);
    console.log('🔗 Certificats copiés vers docker/nginx/certs (paths stables)');
  }

  // Fonction principale d'auto-configuration avec détection intelligente
  async autoSetup() {
    console.log('🚀 Auto-configuration intelligente des certificats SSL...');
    
    // 1. Détecter l'environnement optimal
    const envConfig = await this.detector.detect();
    const primaryIP = envConfig.VITE_PRIMARY_IP || envConfig.primaryIP;
    const allIPs = envConfig.VITE_ALL_IPS || envConfig.allIPs;
    
    console.log(`� Configuration automatique:`);
    console.log(`   IP principale: ${primaryIP}`);
    console.log(`   Toutes les IPs: ${allIPs.join(', ')}`);
    console.log(`   Pattern d'usage: ${envConfig.VITE_USAGE_PATTERN || envConfig.usagePattern}`);
    
    // 2. Vérifier/générer les certificats
    if (!this.certificatesExistForAnyIP(allIPs)) {
      console.log('📜 Génération des certificats pour toutes les IPs détectées...');
      this.generateCertificatesForIPs(allIPs.filter(ip => ip !== 'localhost' && ip !== '127.0.0.1'));
    } else {
      console.log('✅ Certificats existants trouvés');
      
      // Vérifier si on a besoin de régénérer pour de nouvelles IPs
      const missingIPs = allIPs.filter(ip => 
        ip !== 'localhost' && ip !== '127.0.0.1' && !this.certificatesExistForIP(ip)
      );
      
      if (missingIPs.length > 0) {
        console.log(`🔄 Génération pour nouvelles IPs: ${missingIPs.join(', ')}`);
        this.generateCertificatesForIPs(allIPs.filter(ip => ip !== 'localhost' && ip !== '127.0.0.1'));
      }
    }
    
    // 3. Mettre à jour les configurations avec l'IP principale
    this.updateConfigurations(primaryIP);
    
    // 4. Nettoyer les anciens certificats
    this.cleanOldCertificates(allIPs);
    
    console.log(`🎉 Configuration automatique terminée`);
  console.log(`📍 IP principale: ${primaryIP}`);
  console.log(`📍 Toutes les IPs supportées: ${allIPs.filter(ip => ip !== 'localhost' && ip !== '127.0.0.1').join(', ')}`);
  console.log(`📍 Frontend via Nginx: https://${primaryIP}/  (ou https://localhost/)`);
  console.log(`📍 API via Nginx: https://${primaryIP}/api  (ou https://localhost/api)`);
    
    return { primaryIP, allIPs, envConfig };
  }
}

// Script exécutable
if (require.main === module) {
  const manager = new AutoCertManager();
  
  const command = process.argv[2] || 'auto';
  
  switch (command) {
    case 'auto':
    case 'setup':
      manager.autoSetup()
        .then(result => {
          console.log('\n🎉 Configuration terminée avec succès');
        })
        .catch(error => {
          console.error('❌ Erreur:', error.message);
          process.exit(1);
        });
      break;
      
    case 'ip':
      console.log(manager.getCurrentIP());
      break;
      
    case 'check':
      const ip = manager.getCurrentIP();
      const ips = manager.getAllUsableIPs();
      console.log(`IP principale: ${ip}`);
      console.log(`Toutes les IPs: ${ips.join(', ')}`);
      console.log(`Certificats pour IP principale: ${manager.certificatesExistForIP(ip)}`);
      console.log(`Certificats pour au moins une IP: ${manager.certificatesExistForAnyIP(ips)}`);
      break;
    
    case 'urls': {
      const envConfig = await manager.detector.detect();
      const primaryIP = envConfig.VITE_PRIMARY_IP || envConfig.primaryIP || manager.getCurrentIP();
      console.log('================ TelecomStock URLs ================');
      console.log(`Frontend via Nginx:  https://${primaryIP}/  (ou https://localhost/)`);
      console.log(`API via Nginx:       https://${primaryIP}/api  (ou https://localhost/api)`);
      console.log('===================================================');
      break;
    }
      
    case 'ips':
      const allIPs = manager.getAllUsableIPs();
      console.log('🌐 Toutes les IPs utilisables:');
      allIPs.forEach(ip => {
        const hasCart = manager.certificatesExistForIP(ip);
        console.log(`  ${ip} ${hasCart ? '✅' : '❌'}`);
      });
      break;
      
    default:
      console.log('Usage: node auto-cert-manager.cjs [auto|ip|check|ips]');
      console.log('  auto  - Configuration automatique complète (toutes les IPs)');
      console.log('  ip    - Afficher l\'IP principale');
      console.log('  check - Vérifier l\'état des certificats');
      console.log('  ips   - Lister toutes les IPs et leurs certificats');
  }
}

module.exports = AutoCertManager;