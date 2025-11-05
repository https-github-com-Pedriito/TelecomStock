import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import bcryptjs from 'bcryptjs';

async function resetAdminPassword() {
  try {
    // Initialiser la connexion à la base de données
    await AppDataSource.initialize();

    const userRepository = AppDataSource.getRepository(User);
    
    // Hasher le nouveau mot de passe
    const password = 'admin123';
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Mettre à jour le mot de passe de l'administrateur
    await userRepository.update(
      { email: 'admin@telecom.com' },
      { password_hash: hashedPassword }
    );

    console.log('Le mot de passe de l\'administrateur a été réinitialisé avec succès.');
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe :', error);
  } finally {
    // Fermer la connexion à la base de données
    await AppDataSource.destroy();
  }
}

resetAdminPassword();
