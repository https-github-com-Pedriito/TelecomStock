const { Client } = require('pg');
const bcryptjs = require('bcryptjs');

async function setNewPassword() {
  const newPassword = process.argv[2];
  
  if (!newPassword) {
    console.log('Usage: node set-tech-password.cjs <nouveau_mot_de_passe>');
    process.exit(1);
  }

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

    // Générer un nouveau hash
    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(newPassword, salt);
    
    console.log(`Nouveau mot de passe: ${newPassword}`);

    // Mettre à jour
    const result = await client.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hash, 'tech@telecom.com']
    );

    console.log(`✅ Mot de passe mis à jour pour tech@telecom.com`);

    // Tester le hash
    const checkResult = await client.query(
      'SELECT password_hash FROM users WHERE email = $1',
      ['tech@telecom.com']
    );

    const isValid = await bcryptjs.compare(newPassword, checkResult.rows[0].password_hash);
    console.log(`✅ Test de validation: ${isValid ? 'SUCCÈS' : 'ÉCHEC'}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

setNewPassword().catch(console.error);
