const https = require('https');

// Désactiver la vérification des certificats auto-signés
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const articleId = 'cacef8bc-aa8d-4beb-b145-47003f316b23';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0LXVzZXIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTgyODgzMjEsImV4cCI6MTc1ODI5MTkyMX0.S9Wr2G4XYsY_4Ep_62eo3E6hM-YHutPUkH_4MwByyVE';

console.log('🧹 Suppression forcée de l\'article de test avec ses mouvements...');

const options = {
  hostname: '192.168.1.46',
  port: 3443,
  path: `/articles/${articleId}?force=true`,
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`📡 Statut: ${res.statusCode}`);
    if (data) {
      console.log('📄 Réponse:', data);
    }
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Article de test et mouvements supprimés avec succès !');
    } else {
      console.log('❌ Erreur lors de la suppression');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erreur:', error.message);
});

req.end();