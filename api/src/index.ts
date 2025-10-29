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
  
  // Resolve HTTPS certificates dynamically to match the active IP/host
  const apiRoot = path.join(__dirname, '..');

  const getPrimaryIP = (): string | null => {
    try {
      // If HOST is defined, use it
      const envHost = process.env.HOST;
      if (envHost && /^(\d{1,3}\.){3}\d{1,3}$/.test(envHost)) return envHost;

      const ifaces = os.networkInterfaces();
      // Prefer Wi-Fi
      for (const name of Object.keys(ifaces)) {
        if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wifi')) {
          for (const net of ifaces[name] || []) {
            if (net && net.family === 'IPv4' && !net.internal && net.address !== '127.0.0.1') {
              return net.address;
            }
          }
        }
      }
      // Then Ethernet
      for (const name of Object.keys(ifaces)) {
        if (name.toLowerCase().includes('ethernet')) {
          for (const net of ifaces[name] || []) {
            if (net && net.family === 'IPv4' && !net.internal && net.address !== '127.0.0.1') {
              return net.address;
            }
          }
        }
      }
      // Any external IPv4
      for (const name of Object.keys(ifaces)) {
        for (const net of ifaces[name] || []) {
          if (net && net.family === 'IPv4' && !net.internal && net.address !== '127.0.0.1') {
            return net.address;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const resolveCertPaths = () => {
    // 1) Env overrides
    if (process.env.SSL_KEY && process.env.SSL_CERT) {
      return {
        keyPath: process.env.SSL_KEY!,
        certPath: process.env.SSL_CERT!
      };
    }

    const primaryIP = getPrimaryIP();
    const candidates: Array<{ keyPath: string; certPath: string; reason: string }> = [];

    // Helper to push candidate pairs
    const pushPair = (basename: string, label: string) => {
      candidates.push({
        keyPath: path.join(apiRoot, `${basename}-key.pem`),
        certPath: path.join(apiRoot, `${basename}.pem`),
        reason: label
      });
    };

    // 2) If we know the IP, try plain and +2 variants
    if (primaryIP) {
      pushPair(primaryIP, `primary ip ${primaryIP}`);
      pushPair(`${primaryIP}+2`, `primary ip ${primaryIP} (+2)`);
    }

    // 3) Prefer common local subnets if present
    // Scan available files in api root
    try {
      const files = fs.readdirSync(apiRoot);
      const pemBases = new Set<string>();
      for (const f of files) {
        const m = f.match(/^(\d+\.\d+\.\d+\.\d+)(\+\d+)?(-key)?\.pem$/);
        if (m) {
          const base = m[1] + (m[2] || '');
          pemBases.add(base);
        }
      }
      // Prioritize 192.168.* then 172.* then others
      const sorted = Array.from(pemBases).sort((a, b) => {
        const score = (s: string) => s.startsWith('192.168.') ? 0 : s.startsWith('172.') ? 1 : 2;
        return score(a) - score(b);
      });
      for (const base of sorted) pushPair(base, `found in folder: ${base}`);
    } catch {}

    // 4) Fallback to localhost+2 if present in api root
    pushPair('localhost+2', 'fallback localhost+2');

    // Pick the first existing pair
    for (const c of candidates) {
      if (fs.existsSync(c.keyPath) && fs.existsSync(c.certPath)) {
        console.log('Using HTTPS certificates:', c);
        return { keyPath: c.keyPath, certPath: c.certPath };
      }
    }

    // Last resort: try root project (one more directory up)
    const root = path.join(apiRoot, '..');
    const tryRootPair = (basename: string) => ({
      keyPath: path.join(root, `${basename}-key.pem`),
      certPath: path.join(root, `${basename}.pem`)
    });
    const rootPairs = [
      ...(primaryIP ? [tryRootPair(primaryIP), tryRootPair(`${primaryIP}+2`)] : []),
      tryRootPair('localhost+2')
    ];
    for (const rp of rootPairs) {
      if (fs.existsSync(rp.keyPath) && fs.existsSync(rp.certPath)) {
        console.log('Using HTTPS certificates from project root:', rp);
        return rp;
      }
    }

    throw new Error('Aucun certificat HTTPS valide trouvé. Veuillez exécuter: node auto-cert-manager.cjs setup');
  };

  const { keyPath, certPath } = resolveCertPaths();
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };

  // Add request logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
  });

  // Start HTTPS server
  const httpsServer = https.createServer(httpsOptions, app);
  
  // Initialize Socket.IO with HTTPS server
  realtimeService.init(httpsServer);
  
  // Add error handling for HTTPS
  httpsServer.on('error', (error: any) => {
    console.error('HTTPS Server Error:', error);
  });

  httpsServer.listen(Number(httpsPort), '0.0.0.0', () => {
    console.log(`✅ HTTPS Server running on port ${httpsPort}`);
    console.log(`🔗 HTTPS URL: https://${process.env.HOST || 'localhost'}:${httpsPort}`);
    console.log(`🔄 WebSocket temps réel activé sur HTTPS`);
  });

  // Start HTTP server for mobile development (port 3080)
  const httpPort = 3080;
  const httpServer = http.createServer(app);
  
  httpServer.listen(httpPort, '0.0.0.0', () => {
    console.log(`✅ HTTP Server (mobile dev) running on port ${httpPort}`);
    console.log(`📱 HTTP URL: http://${process.env.HOST || 'localhost'}:${httpPort}`);
    console.log(`🔧 Use HTTP for mobile if HTTPS certificates are rejected`);
  });
}).catch(error => {
  console.error('Database connection failed:', error);
});
