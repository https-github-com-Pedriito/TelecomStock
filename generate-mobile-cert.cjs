const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration du certificat
const domain = '192.168.1.53';
const commonName = domain;
const organizationName = 'TelecomStock Dev';
const countryCode = 'FR';

console.log('🔐 Génération du certificat mobile-friendly...');

// Configuration OpenSSL pour un certificat auto-signé avec extensions SAN
const opensslConfig = `
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C=${countryCode}
ST=Local
L=Local
O=${organizationName}
CN=${commonName}

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ${domain}
IP.3 = 172.24.112.1
`;

// Écrire le fichier de configuration
const configFile = 'mobile-cert.conf';
fs.writeFileSync(configFile, opensslConfig);

try {
  // Générer la clé privée
  console.log('📝 Génération de la clé privée...');
  execSync(`openssl genrsa -out mobile-key.pem 2048`, { stdio: 'inherit' });

  // Générer le certificat auto-signé
  console.log('📜 Génération du certificat...');
  execSync(`openssl req -new -x509 -key mobile-key.pem -out mobile-cert.pem -days 365 -config ${configFile} -extensions v3_req`, { stdio: 'inherit' });

  // Nettoyer le fichier de configuration temporaire
  fs.unlinkSync(configFile);

  // Copier les certificats dans le dossier API
  fs.copyFileSync('mobile-cert.pem', 'api/mobile-cert.pem');
  fs.copyFileSync('mobile-key.pem', 'api/mobile-key.pem');

  console.log('✅ Certificats générés avec succès !');
  console.log('📁 Fichiers créés :');
  console.log('  - mobile-cert.pem (certificat)');
  console.log('  - mobile-key.pem (clé privée)');
  console.log('  - api/mobile-cert.pem (copie pour l\'API)');
  console.log('  - api/mobile-key.pem (copie pour l\'API)');

} catch (error) {
  console.error('❌ Erreur lors de la génération :', error.message);
  
  // Nettoyage en cas d'erreur
  if (fs.existsSync(configFile)) {
    fs.unlinkSync(configFile);
  }
  
  process.exit(1);
}
