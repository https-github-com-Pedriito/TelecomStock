import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';
import { allowedOrigins } from '../config/corsOrigins';

// Types pour les événements Socket.IO
export interface DatabaseChangeEvent {
  type: 'create' | 'update' | 'delete';
  table: string;
  data?: any;
  id?: number | string;
  timestamp: Date;
  userId?: string;
}

export interface SocketUser {
  id: string;
  userId?: string;
  role?: string;
  connectedAt: Date;
}

class RealtimeService {
  private io!: SocketIOServer;
  private connectedUsers = new Map<string, SocketUser>();

  constructor() {
    // Le serveur sera initialisé plus tard
  }

  init(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupSocketHandlers();
    console.log('🔄 Service de temps réel initialisé');
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔗 Nouvelle connexion WebSocket: ${socket.id}`);

      // Authentification du socket : le rôle/userId viennent du JWT vérifié,
      // jamais de ce que le client affirme, pour empêcher l'usurpation de rôle.
      socket.on('authenticate', (data: { token?: string }) => {
        if (!data.token) {
          socket.emit('authenticated', { success: false, message: 'Token manquant' });
          return;
        }

        let decoded: { userId: string; role: string };
        try {
          decoded = jwt.verify(data.token, JWT_SECRET) as { userId: string; role: string };
        } catch {
          socket.emit('authenticated', { success: false, message: 'Token invalide' });
          return;
        }

        const user: SocketUser = {
          id: socket.id,
          userId: decoded.userId,
          role: decoded.role,
          connectedAt: new Date()
        };

        this.connectedUsers.set(socket.id, user);
        socket.join(`user_${decoded.userId}`); // Rejoindre une room personnelle

        console.log(`👤 Utilisateur authentifié: ${decoded.userId} (${decoded.role})`);

        // Envoyer le statut de connexion
        socket.emit('authenticated', {
          success: true,
          userId: decoded.userId,
          role: decoded.role,
          connectedUsers: this.connectedUsers.size
        });
      });

      // Gestion des déconnexions
      socket.on('disconnect', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          console.log(`🔌 Déconnexion: ${user.userId} (${socket.id})`);
          this.connectedUsers.delete(socket.id);
        }
      });

      // Ping/Pong pour maintenir la connexion
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  // Notifier tous les clients connectés d'un changement
  notifyDatabaseChange(event: DatabaseChangeEvent) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO non initialisé');
      return;
    }

    console.log(`📢 Notification changement DB: ${event.type} sur ${event.table}`);
    
    // Émettre vers tous les clients connectés
    this.io.emit('database_change', event);

    // Émettre vers une room spécifique selon le type
    switch (event.table) {
      case 'article':
        this.io.emit('articles_changed', event);
        break;
      case 'mouvement':
        this.io.emit('mouvements_changed', event);
        break;
      case 'fournisseur':
        this.io.emit('fournisseurs_changed', event);
        break;
      case 'user':
        this.io.emit('users_changed', event);
        break;
    }
  }

  // Notifier un utilisateur spécifique
  notifyUser(userId: string, event: any) {
    this.io.to(`user_${userId}`).emit('user_notification', event);
  }

  // Obtenir les statistiques de connexion
  getConnectionStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      users: Array.from(this.connectedUsers.values()).map(u => ({
        userId: u.userId,
        role: u.role,
        connectedAt: u.connectedAt
      }))
    };
  }

  // Diffuser un message à tous les clients
  broadcast(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

// Instance singleton
export const realtimeService = new RealtimeService();