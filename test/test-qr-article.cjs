const https = require('https');

// Désactiver la vérification des certificats auto-signés
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Test de création d'un article avec QR code
const articleData = JSON.stringify({
  nom: `Article QR Code Test ${new Date().toLocaleTimeString()}`,
  categorie: 'Équipements réseau',
  fournisseur: 'Test QR',
  localisation: 'Entrepôt principal',
  seuil_minimum: 5,
  quantite_stock: 10,
  code_barres: `QR${Date.now()}` // Code unique pour QR code
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

console.log('🚀 Création d\'un article pour tester les QR codes...');

const req = https.request(options, (res) => {
  console.log(`📡 Statut: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 201) {
      const article = JSON.parse(data);
      console.log('✅ Article créé avec succès !');
      console.log('📦 Nom:', article.nom);
      console.log('🔲 Code QR:', article.code_barres);
      console.log('🆔 ID:', article.id);
      console.log('\n👀 Vérifiez maintenant dans l\'application - vous devriez voir un QR code !');
    } else {
      console.log('❌ Erreur:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erreur:', error.message);
});

req.write(articleData);
req.end();