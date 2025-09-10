const bcryptjs = require('bcryptjs');

async function generateHash() {
  const password = 'tech123';
  const salt = await bcryptjs.genSalt(10);
  const hash = await bcryptjs.hash(password, salt);
  console.log(`Hash pour "${password}": ${hash}`);
  
  // Test de vérification
  const isValid = await bcryptjs.compare(password, hash);
  console.log(`Vérification: ${isValid}`);
}

generateHash().catch(console.error);
