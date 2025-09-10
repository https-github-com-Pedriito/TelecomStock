import { Router } from 'express';
import { AppDataSource } from '../data-source';
import bcryptjs from 'bcryptjs';
import { User, UserRole } from '../entities/User';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all users
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const users = await userRepository.find();
    const usersWithoutPasswords = users.map(user => {
      const { password_hash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// Get user by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id } });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const { password_hash: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'utilisateur' });
  }
});

// Create user
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { password = 'password', ...userData } = req.body;
    const userRepository = AppDataSource.getRepository(User);

    // Hash du mot de passe
    const salt = await bcryptjs.genSalt(10);
    const password_hash = await bcryptjs.hash(password, salt);

    // Créer l'utilisateur
    const user = await userRepository.save({
      ...userData,
      password_hash
    });

    // Retourner l'utilisateur sans le mot de passe
    const { password_hash: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur' });
  }
});

// Update user
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...userData } = req.body;
    const userRepository = AppDataSource.getRepository(User);
    
    let user = await userRepository.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Si un nouveau mot de passe est fourni, le hasher
    if (password) {
      const salt = await bcryptjs.genSalt(10);
      const password_hash = await bcryptjs.hash(password, salt);
      userData.password_hash = password_hash;
    }

    user = userRepository.merge(user, userData);
    await userRepository.save(user);
    
    const { password_hash: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'utilisateur' });
  }
});

// Delete user
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    await userRepository.remove(user);
    res.status(204).send();
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});

export const usersRouter = router;
