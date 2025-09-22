const jwt = require('jsonwebtoken');

// Créer un token JWT valide pour les tests
const payload = {
  id: 1,
  username: 'test-user',
  role: 'admin'
};

const secret = process.env.JWT_SECRET || 'votre_secret_jwt_super_secure';
const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('🔑 Token JWT généré pour les tests:');
console.log(token);

console.log('\n🧪 Utilisez ce token dans vos tests avec:');
console.log(`Authorization: Bearer ${token}`);