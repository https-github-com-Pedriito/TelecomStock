import 'dotenv/config';
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { AppDataSource } from './data-source';
import { allowedOrigins } from './config/corsOrigins';
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
// CSP et CORP désactivés : la doc Swagger charge des scripts depuis unpkg.com
// et les images d'articles sont chargées cross-origin par le frontend.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

// Configuration CORS
const corsOptions = {
  origin: (origin: any, callback: any) => {
    console.log('CORS Origin:', origin);
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));
app.use(express.json());

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Swagger Documentation (custom HTML for Vercel compatibility)
app.get('/api-docs', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TelecomStock API Documentation</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
      <style>
        .topbar { display: none !important; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = function() {
          window.ui = SwaggerUIBundle({
            url: '/api-docs.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
            persistAuthorization: true
          });
        };
      </script>
    </body>
    </html>
  `;
  res.send(html);
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
  
  // Add request logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
  });

  // Support for Fly.io PORT environment variable
  const httpPort = parseInt(process.env.PORT || '3080', 10);
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
