import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AppDataSource } from './data-source';
import { initAIDataSource } from './ai-data-source';
import { authRouter } from './routes/auth';
import { articlesRouter } from './routes/articles';
import { mouvementsRouter } from './routes/mouvements';
import { usersRouter } from './routes/users';
import { fournisseursRouter } from './routes/fournisseurs';
import { inventairesRouter } from './routes/inventaires';
import { localisationsRouter } from './routes/localisations';
import assistantRouter from './routes/assistant';
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

// Route racine pour vérifier que l'API fonctionne
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'TelecomStock API is running',
    version: '1.0.0',
    endpoints: ['/auth', '/articles', '/mouvements', '/users', '/fournisseurs']
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
app.use('/assistant', assistantRouter);
//app.use('/reports', reportsRouter);

// Database connections
AppDataSource.initialize().then(async () => {
  console.log('✅ Main database connection established');
  
  // Initialize READ-ONLY AI connection
  await initAIDataSource();
  console.log('✅ AI READ-ONLY connection established');
  
  // Add request logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
  });

  // Start HTTP server only (no HTTPS)
  const httpPort = 3080;
  const httpServer = http.createServer(app);
  
  // Initialize Socket.IO with HTTP server
  realtimeService.init(httpServer);
  
  httpServer.listen(httpPort, '0.0.0.0', () => {
    console.log(`✅ HTTP Server running on port ${httpPort}`);
    console.log(`� HTTP URL: http://${process.env.HOST || 'localhost'}:${httpPort}`);
    console.log(`🔄 WebSocket temps réel activé sur HTTP`);
  });
}).catch(error => {
  console.error('Database connection failed:', error);
});
