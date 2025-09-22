import { api } from '../src/lib/api.js';

async function testUserAPI() {
  try {
    console.log('🔧 Testing User API...');
    
    // Test login first
    console.log('1. Testing login...');
    const loginResponse = await api.login('admin@telecom.com', 'password');
    console.log('✅ Login successful:', loginResponse.user.nom);
    
    // Test get users
    console.log('2. Testing get users...');
    const users = await api.getUsers();
    console.log('✅ Users retrieved:', users.length, 'users found');
    users.forEach(user => {
      console.log(`   - ${user.nom} ${user.prenom} (${user.role}) - ${user.is_active ? 'Active' : 'Inactive'}`);
    });
    
    // Test create user
    console.log('3. Testing create user...');
    const newUserData = {
      nom: 'Test',
      prenom: 'User',
      email: 'test@telecom.com',
      role: 'TECHNICIEN',
      is_active: true
    };
    
    const newUser = await api.createUser(newUserData);
    console.log('✅ User created:', newUser.nom, newUser.prenom);
    
    // Test update user
    console.log('4. Testing update user...');
    await api.updateUser(newUser.id, { is_active: false });
    console.log('✅ User updated (deactivated)');
    
    // Test delete user
    console.log('5. Testing delete user...');
    await api.deleteUser(newUser.id);
    console.log('✅ User deleted');
    
    console.log('🎉 All user API tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

testUserAPI();
