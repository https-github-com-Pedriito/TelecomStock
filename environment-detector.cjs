const { networkInterfaces } = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class EnvironmentDetector {
  constructor() {
    this.rootPath = process.cwd();
    this.configFile = path.join(this.rootPath, '.env.auto');
  }

  // Détecter toutes les IPs disponibles avec métadonnées
  getNetworkInfo() {
    const interfaces = networkInterfaces();
    const networkInfo = [];
    
    for (const [name, nets] of Object.entries(interfaces)) {
      for (const net of nets) {
        if (net.family === 'IPv4' && !net.internal) {
          networkInfo.push({
            name: name,
            ip: net.address,
            type: this.getInterfaceType(name),
            priority: this.getInterfacePriority(name),
            accessible: false // Sera testé
          });
        }
      }
    }
    
    return networkInfo.sort((a, b) => b.priority - a.priority);
  }

  // Classifier les interfaces par type
  getInterfaceType(interfaceName) {
    const name = interfaceName.toLowerCase();
    if (name.includes('wi-fi') || name.includes('wifi')) return 'wifi';
    if (name.includes('ethernet')) return 'ethernet';
    if (name.includes('wsl') || name.includes('hyper-v')) return 'wsl';
    if (name.includes('docker') || name.includes('veth')) return 'docker';
    return 'other';
  }

  // Définir les priorités par type d'interface
  getInterfacePriority(interfaceName) {
    const type = this.getInterfaceType(interfaceName);
    const priorities = {
      wifi: 100,      // Priorité max pour mobile
      ethernet: 90,   // Bon pour desktop
      wsl: 80,        // WSL/Dev
      docker: 70,     // Docker
      other: 60       // Autres
    };
    return priorities[type] || 50;
  }

  // Tester la connectivité sur chaque interface
  async testConnectivity(networkInfo) {
    console.log('🔍 Test de connectivité sur toutes les interfaces...');
    
    for (const info of networkInfo) {
      try {
        // Test ping rapide vers Google DNS
        const pingCommand = process.platform === 'win32' 
          ? `ping -n 1 -w 1000 8.8.8.8`
          : `ping -c 1 -W 1 8.8.8.8`;
          
        execSync(pingCommand, { 
          stdio: 'pipe',
          timeout: 2000 
        });
        
        info.accessible = true;
        console.log(`✅ ${info.name} (${info.ip}) - ${info.type} - ACCESSIBLE`);
      } catch (error) {
        info.accessible = false;
        console.log(`❌ ${info.name} (${info.ip}) - ${info.type} - NON ACCESSIBLE`);
      }
    }
    
    return networkInfo.filter(info => info.accessible);
  }

  // Détecter l'usage actuel (mobile vs desktop)
  detectUsagePattern() {
    const logFile = path.join(this.rootPath, '.access-log');
    let usagePattern = 'auto';
    
    try {
      if (fs.existsSync(logFile)) {
        const logs = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
        const recentLogs = logs.slice(-10); // 10 dernières connexions
        
        const mobileAccess = recentLogs.filter(log => 
          log.includes('Mobile') || log.includes('iPhone') || log.includes('Android')
        ).length;
        
        if (mobileAccess > recentLogs.length * 0.7) {
          usagePattern = 'mobile-primary';
        } else if (mobileAccess > 0) {
          usagePattern = 'hybrid';
        } else {
          usagePattern = 'desktop-primary';
        }
      }
    } catch (error) {
      console.log('ℹ️ Pas d\'historique d\'usage, détection automatique');
    }
    
    console.log(`📊 Pattern d'usage détecté: ${usagePattern}`);
    return usagePattern;
  }

  // Choisir la meilleure configuration selon le contexte
  async chooseBestConfiguration() {
    console.log('🤖 Détection automatique de l\'environnement optimal...');
    
    const networkInfo = this.getNetworkInfo();
    const accessibleNetworks = await this.testConnectivity(networkInfo);
    const usagePattern = this.detectUsagePattern();
    
    if (accessibleNetworks.length === 0) {
      throw new Error('❌ Aucune interface réseau accessible trouvée');
    }
    
    let primaryIP;
    let fallbackIPs = [];
    
    // Stratégie de sélection basée sur l'usage
    switch (usagePattern) {
      case 'mobile-primary':
        // Priorité Wi-Fi pour usage mobile intensif
        primaryIP = accessibleNetworks.find(n => n.type === 'wifi')?.ip ||
                   accessibleNetworks[0].ip;
        fallbackIPs = accessibleNetworks.filter(n => n.ip !== primaryIP).map(n => n.ip);
        console.log('📱 Configuration optimisée pour usage mobile');
        break;
        
      case 'desktop-primary':
        // Priorité Ethernet/WSL pour usage desktop
        primaryIP = accessibleNetworks.find(n => n.type === 'ethernet' || n.type === 'wsl')?.ip ||
                   accessibleNetworks[0].ip;
        fallbackIPs = accessibleNetworks.filter(n => n.ip !== primaryIP).map(n => n.ip);
        console.log('💻 Configuration optimisée pour usage desktop');
        break;
        
      case 'hybrid':
      default:
        // Sélection intelligente: Wi-Fi si disponible, sinon le plus prioritaire
        const wifiNetwork = accessibleNetworks.find(n => n.type === 'wifi');
        if (wifiNetwork && accessibleNetworks.length > 1) {
          primaryIP = wifiNetwork.ip;
          fallbackIPs = accessibleNetworks.filter(n => n.ip !== primaryIP).map(n => n.ip);
          console.log('🔀 Configuration hybride avec priorité Wi-Fi');
        } else {
          primaryIP = accessibleNetworks[0].ip;
          fallbackIPs = accessibleNetworks.slice(1).map(n => n.ip);
          console.log('⚖️ Configuration automatique par priorité');
        }
        break;
    }
    
    const config = {
      primaryIP,
      fallbackIPs,
      allIPs: [primaryIP, ...fallbackIPs],
      usagePattern,
      detectedAt: new Date().toISOString(),
      networks: accessibleNetworks
    };
    
    // Sauvegarder la configuration
    this.saveConfiguration(config);
    
    console.log(`🎯 IP principale choisie: ${primaryIP}`);
    console.log(`🔄 IPs de fallback: ${fallbackIPs.join(', ')}`);
    
    return config;
  }

  // Sauvegarder la configuration détectée
  saveConfiguration(config) {
    const configContent = `# Configuration auto-générée le ${config.detectedAt}
# Pattern d'usage: ${config.usagePattern}
VITE_PRIMARY_IP=${config.primaryIP}
VITE_FALLBACK_IPS=${config.fallbackIPs.join(',')}
VITE_ALL_IPS=${config.allIPs.join(',')}
VITE_USAGE_PATTERN=${config.usagePattern}
VITE_AUTO_CONFIG=true
`;
    
    fs.writeFileSync(this.configFile, configContent);
    console.log(`💾 Configuration sauvée dans ${this.configFile}`);
  }

  // Charger la configuration sauvée
  loadConfiguration() {
    if (!fs.existsSync(this.configFile)) {
      return null;
    }
    
    try {
      const content = fs.readFileSync(this.configFile, 'utf8');
      const config = {};
      
      content.split('\n').forEach(line => {
        if (line.startsWith('VITE_')) {
          const [key, value] = line.split('=');
          if (value) {
            if (key.includes('IPS')) {
              config[key] = value.split(',');
            } else {
              config[key] = value;
            }
          }
        }
      });
      
      return config;
    } catch (error) {
      console.warn('⚠️ Erreur lecture configuration:', error.message);
      return null;
    }
  }

  // Vérifier si la configuration actuelle est encore valide
  async isConfigurationValid(config) {
    if (!config || !config.VITE_PRIMARY_IP) return false;
    
    try {
      // Test rapide de la connectivité de l'IP principale
      const pingCommand = process.platform === 'win32' 
        ? `ping -n 1 -w 1000 ${config.VITE_PRIMARY_IP}`
        : `ping -c 1 -W 1 ${config.VITE_PRIMARY_IP}`;
        
      execSync(pingCommand, { stdio: 'pipe', timeout: 2000 });
      
      // Vérifier que l'IP est encore dans les interfaces actuelles
      const currentNetworks = this.getNetworkInfo();
      const isStillAvailable = currentNetworks.some(n => n.ip === config.VITE_PRIMARY_IP);
      
      return isStillAvailable;
    } catch (error) {
      return false;
    }
  }

  // Point d'entrée principal
  async detect(force = false) {
    console.log('🚀 Détecteur d\'environnement intelligent v2.0');
    
    let config = null;
    
    if (!force) {
      config = this.loadConfiguration();
      if (config && await this.isConfigurationValid(config)) {
        console.log('✅ Configuration existante valide, réutilisation');
        console.log(`🎯 IP principale: ${config.VITE_PRIMARY_IP}`);
        return config;
      } else {
        console.log('🔄 Configuration obsolète, nouvelle détection...');
      }
    }
    
    // Nouvelle détection
    config = await this.chooseBestConfiguration();
    return config;
  }
}

// Script exécutable
if (require.main === module) {
  const detector = new EnvironmentDetector();
  
  const command = process.argv[2] || 'detect';
  const force = process.argv.includes('--force');
  
  switch (command) {
    case 'detect':
    case 'auto':
      detector.detect(force)
        .then(config => {
          console.log('\n🎉 Détection terminée');
          console.log(JSON.stringify(config, null, 2));
        })
        .catch(error => {
          console.error('❌ Erreur:', error.message);
          process.exit(1);
        });
      break;
      
    case 'test':
      detector.getNetworkInfo().forEach(info => {
        console.log(`${info.name}: ${info.ip} (${info.type}) - Priorité: ${info.priority}`);
      });
      break;
      
    case 'clean':
      const configFile = path.join(process.cwd(), '.env.auto');
      if (fs.existsSync(configFile)) {
        fs.unlinkSync(configFile);
        console.log('🧹 Configuration nettoyée');
      }
      break;
      
    default:
      console.log('Usage: node environment-detector.cjs [detect|test|clean] [--force]');
      console.log('  detect - Détection automatique (défaut)');
      console.log('  test   - Tester la détection des réseaux');
      console.log('  clean  - Nettoyer la configuration');
      console.log('  --force - Forcer une nouvelle détection');
  }
}

module.exports = EnvironmentDetector;