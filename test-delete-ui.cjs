const https = require('https');

// Désactiver la vérification des certificats auto-signés
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

async function testDeleteWithUI() {
  console.log('🧪 Test de suppression via l\'API (simulation UI)');
  
  const articleId = 'cacef8bc-aa8d-4beb-b145-47003f316b23';
  console.log(`📦 Test de suppression de l'article: ${articleId}`);
  
  try {
    // Première tentative sans force (devrait retourner 409 avec détails)
    const result = await deleteArticleAPI(articleId, false);
    console.log('❌ La suppression n\'aurait pas dû réussir sans force');
  } catch (error) {
    console.log('✅ Suppression bloquée comme prévu');
    console.log('📋 Status:', error.status);
    console.log('📋 Message:', error.message);
    
    if (error.data && error.data.options) {
      console.log('🔧 Options disponibles:');
      console.log('  - Force Delete:', error.data.options.forceDelete);
      console.log('  - Message:', error.data.options.message);
      console.log('  - Warning:', error.data.options.warning);
      console.log('📊 Détails:', error.data.details);
    }
    
    console.log('\n🆘 Ceci simule ce que le frontend devrait recevoir maintenant');
  }
}

function deleteArticleAPI(articleId, force = false) {
  return new Promise((resolve, reject) => {
    const path = force ? `/articles/${articleId}?force=true` : `/articles/${articleId}`;
    
    const options = {
      hostname: '192.168.1.46',
      port: 3443,
      path: path,
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0LXVzZXIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTgyODgzMjEsImV4cCI6MTc1ODI5MTkyMX0.S9Wr2G4XYsY_4Ep_62eo3E6hM-YHutPUkH_4MwByyVE'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const responseData = data ? JSON.parse(data) : {};
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseData);
        } else {
          const error = new Error(responseData.message || `Erreur ${res.statusCode}`);
          error.status = res.statusCode;
          error.data = responseData;
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

testDeleteWithUI().catch(console.error);