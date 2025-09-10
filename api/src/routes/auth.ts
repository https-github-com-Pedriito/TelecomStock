import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../entities/User';
import { authMiddleware } from '../middleware/auth';
import { AppDataSource } from '../data-source';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const validPassword = await bcryptjs.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Ne pas retourner le mot de passe
    const { password_hash: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
});

// Get profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: req.user.userId } });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Ne pas retourner le mot de passe
    const { password_hash: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du profil' });
  }
});

export const authRouter = router;
