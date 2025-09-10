const https = require('https');

// Configuration pour ignorer les certificats auto-signés en dev
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Test de connexion
const testLogin = async (email, password) => {
  const data = JSON.stringify({
    email: email,
    password: password
  });

  const options = {
    hostname: 'localhost',
    port: 3443,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${body}`);
        resolve({ status: res.statusCode, body: JSON.parse(body) });
      });
    });

    req.on('error', (error) => {
      console.error('Error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
};

// Test avec différents comptes et mots de passe
const runTests = async () => {
  console.log('=== Test de connexion ===\n');
  
  // Test 1: Admin avec mot de passe par défaut
  console.log('1. Test Admin avec mot de passe par défaut:');
  try {
    await testLogin('admin@telecom.com', 'password');
  } catch (error) {
    console.log('Erreur:', error.message);
  }
  
  console.log('\n2. Test Technicien avec mot de passe par défaut:');
  try {
    await testLogin('tech@telecom.com', 'password');
  } catch (error) {
    console.log('Erreur:', error.message);
  }
  
  console.log('\n3. Test Technicien avec nouveau mot de passe (vous devrez saisir le mot de passe que vous avez défini):');
  // Remplacez "nouveau_mot_de_passe" par le mot de passe que vous avez défini
  const nouveauMotDePasse = process.argv[2] || 'test123';
  console.log(`Tentative avec le mot de passe: ${nouveauMotDePasse}`);
  try {
    await testLogin('tech@telecom.com', nouveauMotDePasse);
  } catch (error) {
    console.log('Erreur:', error.message);
  }
};

runTests().catch(console.error);
