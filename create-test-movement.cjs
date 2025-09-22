const https = require('https');

// Désactiver la vérification des certificats auto-signés
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Créer un mouvement pour l'article spécifié
const articleId = 'cacef8bc-aa8d-4beb-b145-47003f316b23'; // Article créé précédemment

const mouvementData = JSON.stringify({
  article_id: articleId,
  quantite: 5,
  type: 'ENTREE',
  utilisateur: 'test-user',
  commentaire: 'Mouvement de test pour suppression'
});

const options = {
  hostname: '192.168.1.46',
  port: 3443,
  path: '/mouvements',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(mouvementData),
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0LXVzZXIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTgyODgzMjEsImV4cCI6MTc1ODI5MTkyMX0.S9Wr2G4XYsY_4Ep_62eo3E6hM-YHutPUkH_4MwByyVE'
  }
};

console.log('🚀 Création d\'un mouvement pour l\'article:', articleId);

const req = https.request(options, (res) => {
  console.log(`📡 Statut: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📄 Réponse:', data);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Mouvement créé avec succès !');
      console.log('🔄 L\'article a maintenant un mouvement associé - test de suppression possible');
    } else {
      console.log('❌ Erreur lors de la création du mouvement');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erreur:', error.message);
});

req.write(mouvementData);
req.end();