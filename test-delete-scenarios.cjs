const https = require('https');

// Désactiver la vérification des certificats auto-signés
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0LXVzZXIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTgyODgzMjEsImV4cCI6MTc1ODI5MTkyMX0.S9Wr2G4XYsY_4Ep_62eo3E6hM-YHutPUkH_4MwByyVE';

async function testDeleteScenarios() {
  console.log('🧪 Test des scénarios de suppression d\'articles\n');

  // 1. Créer un article de test
  console.log('1. Création d\'un article de test...');
  const newArticle = await createTestArticle();
  console.log(`✅ Article créé: ${newArticle.id}\n`);

  // 2. Tester suppression normale (devrait fonctionner)
  console.log('2. Test suppression normale (sans mouvements)...');
  try {
    await deleteArticle(newArticle.id, false);
    console.log('✅ Suppression réussie\n');
  } catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
  }

  // 3. Créer un article avec mouvement
  console.log('3. Création d\'un article avec mouvement...');
  const articleWithMovement = await createTestArticle();
  await createTestMovement(articleWithMovement.id);
  console.log(`✅ Article avec mouvement créé: ${articleWithMovement.id}\n`);

  // 4. Tester suppression sans force (devrait échouer avec options)
  console.log('4. Test suppression sans force (avec mouvements)...');
  try {
    await deleteArticle(articleWithMovement.id, false);
    console.log('❌ La suppression n\'aurait pas dû réussir\n');
  } catch (error) {
    console.log('✅ Suppression bloquée comme prévu');
    console.log('📋 Message:', error.message);
    console.log('🔧 Options disponibles:', error.options ? 'OUI' : 'NON');
    console.log('');
  }

  // 5. Tester suppression avec force (devrait réussir)
  console.log('5. Test suppression avec force (avec mouvements)...');
  try {
    await deleteArticle(articleWithMovement.id, true);
    console.log('✅ Suppression forcée réussie\n');
  } catch (error) {
    console.log('❌ Erreur lors de la suppression forcée:', error.message, '\n');
  }
}

function createTestArticle() {
  return new Promise((resolve, reject) => {
    const articleData = JSON.stringify({
      nom: `Test Article Suppression ${new Date().toLocaleTimeString()}`,
      description: 'Article pour tester la suppression',
      prix: 15.99,
      quantite: 5,
      seuilMinimum: 2
    });

    const options = {
      hostname: '192.168.1.46',
      port: 3443,
      path: '/articles',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(articleData),
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Erreur création article: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(articleData);
    req.end();
  });
}

function createTestMovement(articleId) {
  return new Promise((resolve, reject) => {
    const mouvementData = JSON.stringify({
      article_id: articleId,
      quantite: 3,
      type: 'ENTREE',
      utilisateur: 'test-user',
      commentaire: 'Mouvement de test'
    });

    const options = {
      hostname: '192.168.1.46',
      port: 3443,
      path: '/mouvements',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(mouvementData),
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Erreur création mouvement: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(mouvementData);
    req.end();
  });
}

function deleteArticle(articleId, force = false) {
  return new Promise((resolve, reject) => {
    const path = force ? `/articles/${articleId}?force=true` : `/articles/${articleId}`;
    
    const options = {
      hostname: '192.168.1.46',
      port: 3443,
      path: path,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          resolve(data ? JSON.parse(data) : {});
        } else {
          const errorData = data ? JSON.parse(data) : {};
          const error = new Error(errorData.message || `Erreur ${res.statusCode}`);
          error.options = errorData.options;
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Lancer les tests
testDeleteScenarios().catch(console.error);