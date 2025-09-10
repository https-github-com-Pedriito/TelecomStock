const { Client } = require('pg');
const bcryptjs = require('bcryptjs');

async function fixTechPassword() {
  // Configuration de la base de données
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'telecomstock',
    user: 'admin',
    password: 'adminpassword',
  });

  try {
    await client.connect();
    console.log('Connecté à la base de données');

    // Générer un nouveau hash pour tech123
    const password = 'tech123';
    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(password, salt);
    
    console.log(`Nouveau hash généré: ${hash}`);

    // Mettre à jour avec le nouveau hash
    const result = await client.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hash, 'tech@telecom.com']
    );

    console.log(`Mise à jour effectuée: ${result.rowCount} ligne(s) affectée(s)`);

    // Vérifier la mise à jour
    const checkResult = await client.query(
      'SELECT email, password_hash FROM users WHERE email = $1',
      ['tech@telecom.com']
    );

    console.log('Vérification:', checkResult.rows[0]);

    // Tester le hash
    const isValid = await bcryptjs.compare(password, checkResult.rows[0].password_hash);
    console.log(`Test de validation: ${isValid}`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await client.end();
  }
}

fixTechPassword().catch(console.error);
