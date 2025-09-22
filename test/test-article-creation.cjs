const https = require('https');

// Désactiver la vérification des certificats auto-signés
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Test de création d'un article pour déclencher une notification WebSocket
const articleData = JSON.stringify({
  nom: `Test Article ${new Date().toLocaleTimeString()}`,
  description: `Article créé automatiquement pour test WebSocket`,
  prix: 25.99,
  quantite: 10,
  seuilMinimum: 5,
  fournisseurId: 1 // Assurez-vous qu'il y a un fournisseur avec l'ID 1
});

const options = {
  hostname: '192.168.1.46',
  port: 3443,
  path: '/articles', // Pas de préfixe /api
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(articleData),
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0LXVzZXIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTgyODgzMjEsImV4cCI6MTc1ODI5MTkyMX0.S9Wr2G4XYsY_4Ep_62eo3E6hM-YHutPUkH_4MwByyVE' // Token JWT valide
  }
};

console.log('🚀 Envoi d\'une requête de création d\'article...');

const req = https.request(options, (res) => {
  console.log(`📡 Statut: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📄 Réponse:', data);
    if (res.statusCode === 201) {
      console.log('✅ Article créé avec succès !');
      console.log('🔄 Une notification WebSocket devrait avoir été envoyée');
    } else {
      console.log('❌ Erreur lors de la création de l\'article');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erreur:', error.message);
});

// Envoyer les données
req.write(articleData);
req.end();