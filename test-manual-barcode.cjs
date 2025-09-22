const https = require('https');

// Désactiver la vérification des certificats auto-signés
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Test de création d'un article avec code-barres manuel
const articleData = JSON.stringify({
  nom: `Article avec code-barres ${new Date().toLocaleTimeString()}`,
  categorie: 'Équipements réseau',
  fournisseur: 'Fournisseur Test',
  localisation: 'Entrepôt principal',
  prix: 19.99,
  quantite: 15,
  seuilMinimum: 5,
  code_barres: '1234567890123' // Code-barres saisi manuellement
});

const options = {
  hostname: '192.168.1.46',
  port: 3443,
  path: '/articles',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(articleData),
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0LXVzZXIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTgyODgzMjEsImV4cCI6MTc1ODI5MTkyMX0.S9Wr2G4XYsY_4Ep_62eo3E6hM-YHutPUkH_4MwByyVE'
  }
};

console.log('🚀 Test création article avec code-barres manuel...');

const req = https.request(options, (res) => {
  console.log(`📡 Statut: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📄 Réponse:', data);
    if (res.statusCode === 201) {
      const article = JSON.parse(data);
      console.log('✅ Article créé avec succès !');
      console.log('🏷️ Code-barres:', article.code_barres);
      console.log('📦 ID article:', article.id);
    } else {
      console.log('❌ Erreur lors de la création de l\'article');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erreur:', error.message);
});

req.write(articleData);
req.end();