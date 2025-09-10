import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { AppDataSource } from './data-source';
import { authRouter } from './routes/auth';
import { articlesRouter } from './routes/articles';
import { mouvementsRouter } from './routes/mouvements';
import { usersRouter } from './routes/users';
import { fournisseursRouter } from './routes/fournisseurs';

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

// Routes
app.use('/auth', authRouter);
app.use('/articles', articlesRouter);
app.use('/mouvements', mouvementsRouter);
app.use('/users', usersRouter);
app.use('/fournisseurs', fournisseursRouter);
//app.use('/reports', reportsRouter);

// Database connection
AppDataSource.initialize().then(() => {
  console.log('Connected to database');
  
  // Log the current directory and certificate paths
  console.log('Current directory:', __dirname);
  const keyPath = process.env.SSL_KEY || path.join(__dirname, '../localhost+2-key.pem');
  const certPath = process.env.SSL_CERT || path.join(__dirname, '../localhost+2.pem');
  console.log('Looking for certificates at:', {
    keyPath,
    certPath
  });

  // Check if files exist
  const keyExists = fs.existsSync(keyPath);
  const certExists = fs.existsSync(certPath);
  console.log('Certificate files exist?', {
    keyExists,
    certExists
  });

  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };

  // Start HTTPS server only
  const server = https.createServer(httpsOptions, app);
  
  // Add error handling
  server.on('error', (error: any) => {
    console.error('HTTPS Server Error:', error);
  });

  // Add request logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
  });

  server.listen(Number(httpsPort), '0.0.0.0', () => {
    console.log(`HTTPS Server running on port ${httpsPort}`);
    console.log(`Server accepting connections from: https://${process.env.HOST || 'localhost'}:${httpsPort}`);
  });
}).catch(error => {
  console.error('Database connection failed:', error);
});
