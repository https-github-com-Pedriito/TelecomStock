import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { AppDataSource } from './data-source';
import { authRouter } from './routes/auth';
import { articlesRouter } from './routes/articles';
import { mouvementsRouter } from './routes/mouvements';
import { usersRouter } from './routes/users';
import { fournisseursRouter } from './routes/fournisseurs';
import { inventairesRouter } from './routes/inventaires';
import { realtimeService } from './services/realtime';

const app = express();
const port = process.env.PORT || process.env.API_PORT || 3000;

// Middleware
const corsOptions = {
  origin: (origin: any, callback: any) => {
    console.log('CORS Origin:', origin);
    // In production, be more restrictive
    if (process.env.NODE_ENV === 'production') {
      // Allow Render frontend and any https domains
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        /https:\/\/.*\.onrender\.com$/,
        /https:\/\/.*$/
      ];
      
      if (!origin || allowedOrigins.some(allowed => 
        typeof allowed === 'string' ? allowed === origin : (allowed as RegExp).test(origin)
      )) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      callback(null, true); // allow any origin in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));
app.use(express.json());

// Route racine pour vérifier que l'API fonctionne
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'TelecomStock API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: ['/auth', '/articles', '/mouvements', '/users', '/fournisseurs', '/inventaires']
  });
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Endpoint de test pour mobile
app.get('/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'API accessible',
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    ip: req.ip || req.connection?.remoteAddress || 'unknown'
  });
});

// Routes
app.use('/auth', authRouter);
app.use('/articles', articlesRouter);
app.use('/mouvements', mouvementsRouter);
app.use('/users', usersRouter);
app.use('/fournisseurs', fournisseursRouter);
app.use('/inventaires', inventairesRouter);

// Database connection
AppDataSource.initialize().then(() => {
  console.log('Connected to database');
  
  // Start HTTP server (production doesn't need HTTPS, Render handles SSL termination)
  const httpServer = http.createServer(app);
  
  // Initialize Socket.IO with HTTP server
  realtimeService.init(httpServer);
  
  // Add error handling for HTTP
  httpServer.on('error', (error: any) => {
    console.error('HTTP Server Error:', error);
  });

  httpServer.listen(Number(port), '0.0.0.0', () => {
    console.log(`✅ Server running on port ${port}`);
    console.log(`🔗 URL: http://localhost:${port}`);
    console.log(`🔄 WebSocket temps réel activé`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

}).catch(error => {
  console.error('Database connection failed:', error);
  process.exit(1);
});