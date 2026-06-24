import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { User } from '../entities/User';
import { authMiddleware, JWT_SECRET } from '../middleware/auth';
import { AppDataSource } from '../data-source';
import { sendPasswordResetRequestEmail } from '../services/mailer';

const router = Router();

// Limite les tentatives de connexion pour freiner le brute-force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives de connexion, réessayez plus tard.' },
});

// Limite les demandes de réinitialisation pour éviter le spam de l'email admin
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de demandes, réessayez plus tard.' },
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@telecom.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Email ou mot de passe incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', loginLimiter, async (req, res) => {
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

    // Génération d'un token JWT unique à chaque connexion
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        nom: user.nom,
        prenom: user.prenom,
        // iat (issued at) est automatiquement ajouté par jwt.sign()
        // Cela garantit que chaque token est unique
      },
      JWT_SECRET,
      {
        expiresIn: '24h',  // Le token expire après 24h
        // jti: crypto.randomUUID() // Optionnel : identifiant unique du token
      }
    );

    // Ne pas retourner le mot de passe
    const { password_hash: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
});

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Demander la réinitialisation de son mot de passe
 *     description: Envoie un email à l'adresse administrateur configurée (ADMIN_RESET_EMAIL) signalant la demande. Un administrateur doit ensuite définir un nouveau mot de passe via la gestion des utilisateurs.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@telecom.com
 *     responses:
 *       200:
 *         description: Demande prise en compte (réponse générique, que le compte existe ou non)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email requis' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });
    if (user) {
      user.reset_requested_at = new Date();
      await userRepository.save(user);

      try {
        await sendPasswordResetRequestEmail(user.email);
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email de notification:', emailError);
      }
    }

    // Réponse générique pour ne pas révéler si l'email existe
    res.json({ message: 'Si ce compte existe, une demande a été transmise à votre administrateur.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Erreur lors de la demande de réinitialisation' });
  }
});

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Récupérer le profil de l'utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Utilisateur non trouvé
 */
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
