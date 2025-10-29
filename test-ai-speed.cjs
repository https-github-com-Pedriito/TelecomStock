#!/usr/bin/env node

/**
 * Script de test de vitesse de l'IA
 * Usage: node test-ai-speed.cjs
 */

const https = require('https');

// Configuration
const API_HOST = 'localhost';
const API_PORT = 3443;
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkYWVmOWUyMS1kZTBmLTQyYTctYmZhMC0wYjkxNTVmZjllZmIiLCJlbWFpbCI6ImFkbWluQHRlbGVjb20uZnIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Mjk1OTI2ODJ9.o40wV58MlyH_bmPhzm4mUOlRKTWaY90qd_MQ94BZ0NQ'; // Votre token JWT

// Questions de test
const testQuestions = [
  "Combien d'articles en stock ?",
  "Quels articles sont en alerte ?",
  "Liste les mouvements récents",
  "État global du stock ?"
];

function testAISpeed(question) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const postData = JSON.stringify({ question });
    
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/assistant/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      rejectUnauthorized: false // Pour les certificats auto-signés
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = Date.now();
        const totalTime = endTime - startTime;

        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            const performance = response.data.performance;
            
            console.log(`\n✅ Question: "${question}"`);
            console.log(`   ⏱️  Temps total: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
            if (performance) {
              console.log(`   📊 Backend: ${performance.totalMs}ms | IA: ${performance.aiProcessingMs}ms`);
            }
            console.log(`   💬 Réponse: ${response.data.answer.substring(0, 100)}...`);
            
            resolve({ totalTime, performance, answer: response.data.answer });
          } catch (error) {
            reject(new Error(`Parse error: ${error.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Test de vitesse de l\'IA - Modèle: phi3:mini\n');
  console.log('=' .repeat(60));

  const results = [];

  for (const question of testQuestions) {
    try {
      const result = await testAISpeed(question);
      results.push(result);
      
      // Pause de 1 seconde entre les tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`\n❌ Erreur: ${error.message}`);
    }
  }

  // Statistiques finales
  if (results.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('📈 STATISTIQUES GLOBALES:');
    
    const times = results.map(r => r.totalTime);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`   Moyenne: ${avgTime.toFixed(0)}ms (${(avgTime/1000).toFixed(2)}s)`);
    console.log(`   Min: ${minTime}ms (${(minTime/1000).toFixed(2)}s)`);
    console.log(`   Max: ${maxTime}ms (${(maxTime/1000).toFixed(2)}s)`);
    console.log(`   Tests réussis: ${results.length}/${testQuestions.length}`);
    
    if (avgTime < 3000) {
      console.log('\n   🎉 EXCELLENT! Objectif < 3s atteint!');
    } else if (avgTime < 5000) {
      console.log('\n   ✅ BON! Objectif < 5s atteint!');
    } else {
      console.log('\n   ⚠️  Temps moyen > 5s, optimisation recommandée');
    }
  }
  
  console.log('='.repeat(60));
}

// Lancer les tests
runTests().catch(console.error);
