import 'dotenv/config';
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import http from 'http';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { AppDataSource } from './data-source';
import { initAIDataSource } from './ai-data-source';
import { authRouter } from './routes/auth';
import { articlesRouter } from './routes/articles';
import { mouvementsRouter } from './routes/mouvements';
import { usersRouter } from './routes/users';
import { fournisseursRouter } from './routes/fournisseurs';
import { inventairesRouter } from './routes/inventaires';
import { localisationsRouter } from './routes/localisations';
import { realtimeService } from './services/realtime';

const app = express();
const httpPort = process.env.API_PORT || 3001;
const httpsPort = process.env.API_HTTPS_PORT || 3443;

// Middleware
// Configuration CORS plus permissive pour le développement
const corsOptions = {
  origin: (origin: any, callback: any) => {
    console.log('CORS Origin:', origin);
    callback(null, true); // allow any origin
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TelecomStock API Documentation',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Vérifier le statut de l'API
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: API en fonctionnement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: TelecomStock API is running
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 documentation:
 *                   type: string
 *                   example: /api-docs
 */
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'TelecomStock API is running',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: ['/auth', '/articles', '/mouvements', '/users', '/fournisseurs', '/inventaires', '/localisations']
  });
});

// Endpoint de test pour mobile
app.get('/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'API accessible depuis mobile',
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    ip: req.ip || req.connection.remoteAddress
  });
});

// Routes
app.use('/auth', authRouter);
app.use('/articles', articlesRouter);
app.use('/mouvements', mouvementsRouter);
app.use('/users', usersRouter);
app.use('/fournisseurs', fournisseursRouter);
app.use('/inventaires', inventairesRouter);
app.use('/localisations', localisationsRouter);

// Database connections
AppDataSource.initialize().then(async () => {
  console.log('✅ Main database connection established');
  
  // Initialize READ-ONLY AI connection (optionnel, désactivé si ai_assistant n'existe pas)
  try {
    await initAIDataSource();
    console.log('✅ AI READ-ONLY connection established');
  } catch (error) {
    console.log('⚠️  AI DataSource skipped (user ai_assistant not found or error)');
  }
  
  // Add request logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
  });

  // Start HTTP server only (no HTTPS)
  // Support for Fly.io PORT environment variable
  const httpPort = process.env.PORT || 3080;
  const httpServer = http.createServer(app);
  
  // Initialize Socket.IO with HTTP server
  realtimeService.init(httpServer);
  
  httpServer.listen(httpPort, '0.0.0.0', () => {
    console.log(`✅ HTTP Server running on port ${httpPort}`);
    console.log(`🌐 HTTP URL: http://${process.env.HOST || 'localhost'}:${httpPort}`);
    console.log(`🔄 WebSocket temps réel activé sur HTTP`);
  });
}).catch(error => {
  console.error('Database connection failed:', error);
});
