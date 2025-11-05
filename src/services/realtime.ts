import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';

// Types pour les événements Socket.IO
export interface DatabaseChangeEvent {
  type: 'create' | 'update' | 'delete';
  table: string;
  data?: any;
  id?: number | string;
  timestamp: Date;
  userId?: number;
}

export interface SocketUser {
  id: string;
  userId?: number;
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
        origin: "*", // En production, spécifier les domaines autorisés
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

      // Authentification du socket
      socket.on('authenticate', (data: { token?: string, userId?: number, role?: string }) => {
        // Pour les tests, accepter le token "test-token"
        let userId = data.userId;
        let role = data.role || 'user';
        
        if (data.token === 'test-token') {
          userId = 999; // ID de test
          role = 'admin';
        }

        const user: SocketUser = {
          id: socket.id,
          userId: userId,
          role: role,
          connectedAt: new Date()
        };

        this.connectedUsers.set(socket.id, user);
        if (userId) {
          socket.join(`user_${userId}`); // Rejoindre une room personnelle
        }
        
        console.log(`👤 Utilisateur authentifié: ${userId} (${role})`);
        
        // Envoyer le statut de connexion
        socket.emit('authenticated', {
          success: true,
          userId: userId,
          role: role,
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

      // Handler de test pour notre page de test
      socket.on('testDatabaseChange', (data) => {
        console.log('🧪 Test changement BDD reçu:', data);
        // Simuler une notification de changement
        this.io.emit('databaseChange', {
          table: data.table,
          action: data.action,
          data: data.data,
          timestamp: new Date()
        });
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
  notifyUser(userId: number, event: any) {
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