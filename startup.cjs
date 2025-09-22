#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const EnvironmentDetector = require('./environment-detector.cjs');
const AutoCertManager = require('./auto-cert-manager.cjs');

class IntelligentStartup {
  constructor() {
    this.rootPath = process.cwd();
    this.processes = new Map();
    this.isShuttingDown = false;
    
    // Gestionnaire d'arrêt propre
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());
  }

  // Vérifier les prérequis
  checkPrerequisites() {
    console.log('🔍 Vérification des prérequis...');
    
    const requirements = [
      { name: 'Node.js', command: 'node --version' },
      { name: 'NPM', command: 'npm --version' },
      { name: 'Docker', command: 'docker --version' },
      { name: 'Docker Compose', command: 'docker compose version' },
      { name: 'mkcert', command: 'mkcert -version' }
    ];
    
    const missing = [];
    
    for (const req of requirements) {
      try {
        execSync(req.command, { stdio: 'pipe' });
        console.log(`✅ ${req.name}`);
      } catch (error) {
        console.log(`❌ ${req.name} - NON INSTALLÉ`);
        missing.push(req.name);
      }
    }
    
    if (missing.length > 0) {
      console.error(`\n❌ Prérequis manquants: ${missing.join(', ')}`);
      console.log('\n📝 Instructions d\'installation:');
      if (missing.includes('mkcert')) {
        console.log('  mkcert: choco install mkcert (Windows) ou brew install mkcert (Mac)');
      }
      if (missing.includes('Docker')) {
        console.log('  Docker: https://docs.docker.com/get-docker/');
      }
      process.exit(1);
    }
    
    console.log('✅ Tous les prérequis sont installés\n');
  }

  // Détecter et configurer l'environnement
  async setupEnvironment() {
    console.log('🤖 Configuration intelligente de l\'environnement...\n');
    
    try {
      // 1. Détecter l'environnement optimal
      const detector = new EnvironmentDetector();
      const envConfig = await detector.detect();
      
      // 2. Configurer les certificats
      const certManager = new AutoCertManager();
      await certManager.autoSetup();
      
      console.log('\n✅ Environnement configuré avec succès');
      return envConfig;
      
    } catch (error) {
      console.error('❌ Erreur configuration environnement:', error.message);
      throw error;
    }
  }

  // Démarrer les services backend
  async startBackend() {
    console.log('🐳 Démarrage des services backend...');
    
    return new Promise((resolve, reject) => {
      // Arrêter les conteneurs existants
      try {
        execSync('docker compose down', { 
          cwd: path.join(this.rootPath, 'docker'),
          stdio: 'pipe' 
        });
      } catch (error) {
        // Ignore si aucun conteneur n'existe
      }
      
      // Démarrer les nouveaux conteneurs
      const dockerProcess = spawn('docker', ['compose', 'up', '--build', '-d'], {
        cwd: path.join(this.rootPath, 'docker'),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      dockerProcess.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });
      
      dockerProcess.stderr.on('data', (data) => {
        output += data.toString();
        process.stderr.write(data);
      });
      
      dockerProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Services backend démarrés');
          this.processes.set('backend', { type: 'docker', status: 'running' });
          
          // Attendre que l'API soit prête
          this.waitForApi().then(resolve).catch(reject);
        } else {
          reject(new Error(`Docker compose a échoué avec le code ${code}`));
        }
      });
    });
  }

  // Attendre que l'API soit accessible
  async waitForApi(timeout = 60000) { // Augmentation à 60s
    console.log('⏳ Attente de l\'API...');
    
    const startTime = Date.now();
    const checkInterval = 3000; // Intervalle plus long
    
    while (Date.now() - startTime < timeout) {
      try {
        // Essayer plusieurs URLs avec curl/ping au lieu de fetch
        const urls = [
          'https://192.168.1.46:3443',
          'https://172.24.112.1:3443',
          'http://localhost:3080'
        ];
        
        for (const url of urls) {
          try {
            // Utiliser curl pour tester l'accessibilité (route racine au lieu de /health)
            const curlCommand = process.platform === 'win32' 
              ? `curl.exe -k -s --max-time 5 "${url}" -o nul -w "%{http_code}"`
              : `curl -k -s --max-time 5 "${url}" -o /dev/null -w "%{http_code}"`;
              
            const result = execSync(curlCommand, { 
              encoding: 'utf8',
              stdio: 'pipe',
              timeout: 6000 
            });
            
            const statusCode = result.trim();
            if (statusCode === '200' || statusCode === '404') { // 404 aussi OK (API répond)
              console.log(`\n✅ API accessible sur ${url}`);
              return;
            }
          } catch (error) {
            // Continue avec l'URL suivante
          }
        }
        
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        
      } catch (error) {
        // Continue à attendre
      }
    }
    
    // Si on arrive ici, essayons de diagnostiquer
    console.log('\n⚠️ API non accessible après timeout. Diagnostic...');
    try {
      const dockerStatus = execSync('docker compose ps', { 
        cwd: path.join(this.rootPath, 'docker'),
        encoding: 'utf8' 
      });
      console.log('Docker status:', dockerStatus);
      
      const apiLogs = execSync('docker compose logs --tail=20 api', { 
        cwd: path.join(this.rootPath, 'docker'),
        encoding: 'utf8' 
      });
      console.log('API logs:', apiLogs);
    } catch (diagError) {
      console.log('Erreur diagnostic:', diagError.message);
    }
    
    throw new Error('⏰ Timeout: L\'API n\'est pas devenue accessible');
  }

  // Démarrer le frontend
  async startFrontend() {
    console.log('⚡ Démarrage du serveur frontend...');
    
    return new Promise((resolve, reject) => {
      // Lancer Vite directement au lieu de npm run dev pour éviter la récursion
      const frontendProcess = spawn('npx', ['vite'], {
        cwd: this.rootPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });
      
      let output = '';
      frontendProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        process.stdout.write(data);
        
        // Détecter quand Vite est prêt
        if (dataStr.includes('ready in') || dataStr.includes('Local:')) {
          console.log('✅ Serveur frontend prêt');
          this.processes.get('frontend').status = 'running';
          resolve();
        }
      });
      
      frontendProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
      
      frontendProcess.on('close', (code) => {
        if (!this.isShuttingDown) {
          console.log(`⚠️ Frontend terminé avec le code ${code}`);
          this.processes.delete('frontend');
        }
      });
      
      frontendProcess.on('error', (error) => {
        reject(new Error(`Erreur frontend: ${error.message}`));
      });
      
      this.processes.set('frontend', { 
        process: frontendProcess, 
        type: 'node',
        status: 'starting' 
      });
      
      // Timeout si le frontend ne démarre pas
      setTimeout(() => {
        if (this.processes.get('frontend')?.status !== 'running') {
          reject(new Error('⏰ Timeout: Le frontend n\'a pas démarré'));
        }
      }, 60000); // Augmenté à 60s
    });
  }

  // Afficher les informations de connexion
  displayConnectionInfo(envConfig) {
    console.log('\n🎉 DÉMARRAGE TERMINÉ AVEC SUCCÈS!\n');
    
    console.log('📡 URLs d\'accès:');
    if (envConfig.primaryIP || envConfig.VITE_PRIMARY_IP) {
      const primaryIP = envConfig.primaryIP || envConfig.VITE_PRIMARY_IP;
      console.log(`   🌟 Principal: https://${primaryIP}:5173/`);
      console.log(`   🌟 API:       https://${primaryIP}:3443/`);
    }
    
    if (envConfig.allIPs || envConfig.VITE_ALL_IPS) {
      const allIPs = envConfig.allIPs || envConfig.VITE_ALL_IPS.split(',');
      console.log('\n   🔄 Toutes les IPs disponibles:');
      allIPs.forEach(ip => {
        if (ip !== 'localhost' && ip !== '127.0.0.1') {
          console.log(`      - https://${ip}:5173/`);
        }
      });
    }
    
    console.log('\n📊 Services:');
    console.log('   ✅ Base de données PostgreSQL');
    console.log('   ✅ API REST (HTTPS + HTTP fallback)');
    console.log('   ✅ Interface web React');
    console.log('   ✅ Certificats SSL multi-domaines');
    
    console.log(`\n📱 Usage détecté: ${envConfig.usagePattern || envConfig.VITE_USAGE_PATTERN || 'automatique'}`);
    
    console.log('\n🛠️ Commandes utiles:');
    console.log('   Arrêt propre: Ctrl+C');
    console.log('   Logs Docker: docker compose logs -f (dans ./docker)');
    console.log('   Logs pgAdmin: http://localhost:8080 (admin@local.com / adminpassword)');
    
    console.log('\n💡 La configuration est sauvée et sera réutilisée au prochain démarrage');
    console.log('   Pour forcer une nouvelle détection: node startup.cjs --force');
  }

  // Arrêt propre
  async gracefulShutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    console.log('\n🛑 Arrêt en cours...');
    
    // Arrêter le frontend
    const frontend = this.processes.get('frontend');
    if (frontend && frontend.process) {
      console.log('⏹️ Arrêt du frontend...');
      frontend.process.kill('SIGTERM');
    }
    
    // Arrêter Docker
    try {
      console.log('⏹️ Arrêt des services backend...');
      execSync('docker compose down', { 
        cwd: path.join(this.rootPath, 'docker'),
        stdio: 'pipe' 
      });
    } catch (error) {
      console.warn('⚠️ Erreur arrêt Docker:', error.message);
    }
    
    console.log('✅ Arrêt terminé');
    process.exit(0);
  }

  // Point d'entrée principal
  async start(options = {}) {
    try {
      console.log('🚀 DÉMARRAGE INTELLIGENT TELECOMSTOCK\n');
      
      // 1. Vérifications
      this.checkPrerequisites();
      
      // 2. Configuration environnement
      const envConfig = await this.setupEnvironment();
      
      // 3. Services backend
      await this.startBackend();
      
      // 4. Frontend
      await this.startFrontend();
      
      // 5. Informations
      this.displayConnectionInfo(envConfig);
      
    } catch (error) {
      console.error('\n❌ ERREUR DE DÉMARRAGE:', error.message);
      await this.gracefulShutdown();
      process.exit(1);
    }
  }
}

// Script exécutable
if (require.main === module) {
  const startup = new IntelligentStartup();
  
  const args = process.argv.slice(2);
  const options = {
    force: args.includes('--force'),
    verbose: args.includes('--verbose')
  };
  
  startup.start(options);
}

module.exports = IntelligentStartup;