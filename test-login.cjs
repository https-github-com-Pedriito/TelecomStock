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
  
  // Test 1: Admin avec admin123
  console.log('1. Test Admin avec admin123:');
  try {
    await testLogin('admin@telecom.com', 'admin123');
  } catch (error) {
    console.log('Erreur:', error.message);
  }
  
  console.log('\n2. Test Technicien avec tech123:');
  try {
    await testLogin('tech@telecom.com', 'tech123');
  } catch (error) {
    console.log('Erreur:', error.message);
  }
  
  console.log('\n3. Test Manager avec manager123:');
  try {
    await testLogin('manager@telecom.com', 'manager123');
  } catch (error) {
    console.log('Erreur:', error.message);
  }
  
  console.log('\n4. Test Technicien avec nouveau mot de passe:');
  // Remplacez par le mot de passe que vous avez défini
  const nouveauMotDePasse = process.argv[2] || 'nouveaumotdepasse';
  console.log(`Tentative avec le mot de passe: ${nouveauMotDePasse}`);
  try {
    await testLogin('tech@telecom.com', nouveauMotDePasse);
  } catch (error) {
    console.log('Erreur:', error.message);
  }
};

runTests().catch(console.error);
